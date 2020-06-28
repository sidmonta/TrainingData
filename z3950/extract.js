const fs = require('fs')
const path = require('path')
const glob = require('glob')
const parser = require('fast-xml-parser');
const fetch = require('node-fetch')
const db = require('better-sqlite3')('/Users/lucamontanera/Documents/Progetti/Babele/Training/database.db');

class SPARQLQueryDispatcher {
    constructor( endpoint ) {
        this.endpoint = endpoint;
    }

    query( sparqlQuery ) {
        const fullUrl = this.endpoint + '?query=' + encodeURIComponent( sparqlQuery );
        const headers = { 'Accept': 'application/sparql-results+json' };

        return fetch( fullUrl, { headers } ).then( body => body.json() );
    }
}

const endpointUrl = 'https://query.wikidata.org/sparql';
const sparqlQuery = isbn =>`SELECT ?item ?dewey WHERE { ?item wdt:P212|wdt:P957 "${isbn}" }`;

const queryDispatcher = new SPARQLQueryDispatcher( endpointUrl );

const regex = new RegExp('.*(?<record><collection>.*</collection>).*', 'g')

glob('res_*', function (err, files) {
    if (err) {
        console.log(err)
        return false
    }
    console.log(files)
    const options = {
        attributeNamePrefix : "",
        textNodeName : "value",
        ignoreAttributes : false,
        ignoreNameSpace : true,
        allowBooleanAttributes : false,
        parseNodeValue : true,
        parseAttributeValue : false,
        trimValues: true,
        cdataTagName: "__cdata", //default is 'false'
        cdataPositionChar: "\\c",
        parseTrueNumberOnly: false,
        arrayMode: false, //"strict"
    }
    for (file of files) {
        fs.readFile(path.resolve(__dirname, file), 'utf8', (err, data) => {
            const records = data.match(regex)
            if (records && records.length) {
                records
                    .filter(parser.validate)
                    .map(record => parser.getTraversalObj(record, options))
                    .map(record => parser.convertToJson(record, options))
                    .map(record => {
                        const res = record.collection.record
                        const data = res.datafield.find(datafield => datafield.tag === '010')
                        const dewey = res.datafield.find(datafield => datafield.tag === '676')
                        if (data) {
                            const isbn = String(data.subfield.value)
                            if (dewey) {
                                let cdewey = String(dewey.subfield.find(datafield => datafield.code === 'a').value)
                                return [isbn, cdewey]
                            }
                            return [isbn]
                        }
                        return false
                    })
                    .filter(data => data && data[0] !== 'undefined')
                    .map(val => {
                        console.log('Search ',  val)
                        // queryDispatcher.query( sparqlQuery(val[0]) ).then( data => {
                        //     data.results.bindings
                        //         .map(v => v.item.value)
                        //         .forEach(v => {
                        //             console.log(val[1], v)
                        //         })
                        // } ).catch(() => {})
                    })
            }
        })
    }
})


// const endpointUrl = 'https://query.wikidata.org/sparql';
// const sparqlQuery = isbn =>`SELECT ?item ?dewey WHERE { ?item wdt:P212|wdt:P957 "${isbn}" }`;

// const queryDispatcher = new SPARQLQueryDispatcher( endpointUrl );
// const insert = db.prepare('INSERT OR IGNORE INTO data_x_dewey (data_id, dewey_id, real_dewey) VALUES (@url, @dewey, @dewey)')
// const deweys = '000,006,011,012,013,014,015,016,017,018,019,021,022,026,033,034,035,036,037,038,039,050,052,053,054,055,056,057,058,059,060,061,062,063,064,065,066,067,068,071,072,073,074,075,077,078,079,080,082,083,084,085,086,087,088,090,091,093,094,095,096,097,098,099,103,105,106,107,108,114,115,116,117,118,119,120,122,123,124,126,127,130,135,137,138,139,141,142,143,145,146,147,148,149,152,162,165,166,167,169,170,171,173,174,175,176,177,178,180,182,183,184,185,186,187,188,189,195,196,198,199,203,204,205,206,207,208,212,213,214,216,218,222,223,224,227,228,229,233,235,236,238,239,240,245,246,247,249,250,251,254,255,259,260,262,265,267,268,269,272,273,275,276,277,278,279,281,284,285,286,289,290,294,295,310,314,315,316,317,318,319,322,324,325,328,333,336,339,342,345,348,349,350,354,356,357,358,360,361,362,363,367,368,369,374,375,376,377,378,379,380,383,386,389,392,394,395,399,402,403,404,405,406,407,408,409,413,420,421,422,428,429,430,431,432,433,435,437,438,439,441,442,445,447,448,449,450,451,452,453,455,457,458,459,462,463,467,468,469,470,471,472,475,477,478,479,480,482,483,487,488,489,491,492,493,494,495,497,498,499,502,505,506,511,512,514,515,519,521,522,525,526,527,528,529,531,532,533,534,535,536,537,538,539,540,541,542,544,546,547,548,552,554,555,556,557,558,559,561,563,564,565,567,568,569,573,576,579,582,583,584,585,586,587,588,589,592,593,594,595,601,602,603,604,605,606,607,608,609,615,617,618,619,620,623,625,627,629,630,631,633,634,637,638,639,640,643,644,645,646,647,648,649,651,652,653,657,659,661,662,663,664,665,666,667,668,669,670,671,672,673,674,675,677,678,679,680,681,682,683,685,686,687,688,690,691,692,693,695,696,697,698,702,703,705,706,707,708,710,711,712,713,714,715,716,717,718,719,721,722,723,724,725,726,727,731,732,733,734,735,736,737,739,740,742,743,748,749,751,752,753,755,758,761,763,764,765,766,767,769,771,772,773,774,778,781,783,785,786,787,788,790,795,797,798,799,802,803,807,812,814,815,818,825,826,827,829,831,832,834,835,836,837,838,845,849,852,854,857,858,862,865,866,870,872,873,874,875,876,878,879,880,881,882,883,884,885,886,887,888,889,891,892,893,894,897,899,903,904,905,906,907,908,912,916,917,918,931,933,939,949,953,957,958,959,961,962,964,966,969,974,976,977,979,984,985,986,988,989,990,995,996,997,998,999,001.1,001.2,050.9,060.9,080.9,130.1,133.5,133.6,150.8,150.9,152.3,152.5,152.8,153.2,153.7,154.2,154.3,154.7,155.5,158.6,158.7,180.9,190.9,200.8,220.1,220.3,226.2,226.4,226.6,226.7,226.8,226.9,241.5,248.2,248.5,248.6,253.5,254.3,254.4,254.8,260.9,262.9,270.3,270.4,270.5,270.6,270.7,270.8,280.9,284.1,285.7,286.6,287.9,289.4,289.5,289.7,291.2,291.3,291.5,291.6,291.7,291.8,291.9,294.4,294.6,296.1,296.6,296.8,302.4,302.5,305.7,306.9,307.2,310.9,317.1,320.3,320.971,321.4,324.5,327.2,328.2,328.3,330.971,331.2,332.8,333.1,333.5,333.8,335.5,335.6,336.1,336.3,338.3,383.5,383.6,383.7,383.8,383.9,340.9,340.971,341.2,341.23,341.3,341.4,341.7,345.0971,351.1,351.3,351.4,351.5,351.6,351.8,351.9,352.4,352.6,352.7,352.9,353.2,353.3,353.4,353.5,353.6,353.7,353.8,353.9,354.1,355.2,355.5,355.6,355.7,358.1,359.1,359.2,359.3,359.4,359.5,359.6,359.7,359.9,361.1,361.3,361.4,361.8,362.6,363.9,364.2,364.8,368.2,368.4,368.5,368.6,368.7,368.8,369.5,370.8,371.4,371.5,371.6,372.5,378.3,379.3,381.3,384.1,384.3,384.6,387.1,387.2,387.8,388.5,398.6,398.9,408.9,492.4,495.1,495.7,500.2,500.5,502.8,507.8,508.3,513.2,513.5,516.2,516.3,516.9,519.3,519.4,519.5,519.7,519.8,520.1,523.4,523.6,523.7,523.9,526.3,526.9,530.8,534.5,535.5,535.8,537.5,539.2,540.2,541.2,547.1,547.3,547.7,547.8,550.1,550.9,551.9,553.3,553.4,553.5,553.6,553.8,560.9,572.9,573.3,574.1,574.2,574.3,574.4,574.6,574.8,575.1,575.2,581.1,581.2,581.3,581.8,589.1,589.2,589.3,589.4,589.9,591.1,591.2,591.3,591.4,591.8,599.1,599.2,599.5,604.2,604.7,610.6,617.1,617.2,617.3,617.5,617.6,617.8,617.9,620.2,620.3,621.1,621.2,621.6,621.8,621.9,629.3,629.45,630.1,630.2,640.73,641.1,641.4,651.3,651.5,651.7,651.8,652.5,658.2,658.7,668.4,668.9,683.4,688.6,688.8,745.1,745.4,745.7,745.8,745.9,746.1,746.2,746.5,746.6,746.7,780.7,780.92,781.2,781.3,781.4,781.5,781.7,781.8,795.41,808.2,808.4,808.6,808.81,808.82,808.83,809.1,809.2,809.4,809.5,809.6,809.7,813.52,813.54,839.1,909.7,909.82,914.3,915.2,915.5,915.6,915.694,915.9,929.6,940.53,940.54,942.05,942.085,943.086,943.1,943.7,944.04,944.05,946.9,947.083,947.084,947.086,948.1,949.1,949.2,949.3,949.4,949.5,949.8,949.9,951.93,951.95,956.4,956.94,959.1,959.3,959.4,959.5,961.1,961.2,966.1,966.2,966.3,966.5,966.6,966.7,966.8,967.2,967.3,967.4,967.5,967.8,967.9,968.8,973.1,973.2,973.6,973.8,973.917,973.918,973.922,973.923,973.924,973.925,973.926,973.927,973.928,973.929,973.930,973.931,973.932,989.2,993.1,995.3,001.0,003.0,003.1,003.2,003.3,003.7,003.8,004.0,004.3,004.5,004.7,004.9,005.6,006.4,006.5,006.8,111.0,111.1,111.2,111.5,111.6,113.8,157.1,157.3,157.9,137.7,137.8,107.1,107.2,107.6,147.3,147.4,151.1,151.2,133.7,132.2,132.4,132.6,132.7,132.8,178.1,178.2,178.4,178.5,178.6,178.7,178.8,178.9,177.1,177.2,177.3,177.4,177.5,177.6,177.7,177.8,136.2,136.3,136.4,136.5,136.6,136.7,173.1,173.3,173.4,173.5,173.7,172.1,172.2,171.1,171.3,171.5,171.6,171.7,171.9,175.1,175.2,175.3,175.4,175.5,175.6,129.4,156.2,156.3,156.4,156.5,156.9,108.2,108.3,108.9,110.0,110.8,110.9,188.3,188.5,188.6,188.7,188.8,191.1,191.2,191.7,191.9,201.4,201.5,206.1,206.3,204.2,204.5,190.0,190.1,190.2,190.3,190.4,190.5,190.7,190.8,182.1,182.2,182.3,182.4,182.5,182.7,182.8,182.9,152.2,152.6,126.0,220.0,220.2,170.0,170.1,170.2,170.3,170.5,170.6,170.7,196.1,196.9,200.0,200.2,200.3,200.4,200.5,200.6,200.7,142.3,142.7,193.1,193.2,193.3,193.5,193.6,193.7,193.8,193.9,189.1,189.2,189.3,189.4,189.5,207.1,207.2,207.3,207.4,207.5,207.6,207.7,207.8,207.9,230.0,230.3,230.5,230.6,230.7,230.8,237.1,237.2,237.3,237.4,237.5,237.6,237.7,154.1,187.2,187.3,101.4,144.3,144.6,239.1,239.2,239.3,239.4,239.5,239.6,239.7,239.8,109.0,225.1,225.2,225.3,225.7,225.8,225.9,245.2,245.3,241.1,241.2,241.3,135.3,135.4,149.1,149.2,149.3,149.4,149.5,149.6,149.7,149.8,146.3,146.4,146.5,146.6,174.1,174.2,174.4,174.5,174.6,174.7,205.6,277.0,277.2,277.4,277.5,277.6,277.7,277.8,277.9,176.1,176.2,176.3,176.5,176.6,176.7,176.8,183.1,183.2,183.3,183.4,183.5,183.6,274.0,274.4,274.5,274.6,274.7,274.8,274.9,271.1,271.2,271.3,271.4,271.5,271.6,271.7,271.8,271.9,268.1,268.3,268.4,268.6,268.7,268.8,283.5,283.6,283.7,283.8,283.9,262.0,262.1,262.2,262.3,262.4,262.5,262.6,262.7,266.1,266.2,266.3,266.4,266.5,266.6,266.7,266.8,266.9,158.3,158.5,185.0,185.1,185.2,269.6,295.1,295.2,295.3,295.4,295.5,295.6,295.8,280.0,280.1,280.2,294.0,251.0,251.6,150.0,150.2,150.3,150.7,184.1,184.2,212.1,212.6,212.7,121.0,121.2,121.3,121.4,121.5,121.7,121.8,186.1,186.2,186.3,186.4,247.1,247.2,247.3,247.5,247.6,247.7,247.8,247.9,279.1,279.2,279.3,279.4,279.5,279.6,279.7,279.9,123.0,123.7,278.1,278.2,278.3,278.4,278.5,278.6,278.7,278.8,278.9,210.1,210.2,210.3,210.4,210.5,210.7,210.8,210.9,233.2,233.3,233.4,233.5,233.6,233.7,222.2,222.3,222.4,222.5,222.6,222.7,222.8,222.9,211.2,211.3,211.4,211.5,211.7,276.0,276.1,276.2,276.3,276.5,276.6,276.7,276.8,276.9,235.2,235.3,235.4,128.1,128.5,128.6,308.1,308.5,181.2,181.3,181.6,181.8,181.9,192.1,192.2,192.3,192.4,192.5,192.6,192.7,192.9,141.2,141.3,141.5,141.6,299.2,299.4,299.8,255.1,255.2,255.3,255.4,255.5,255.6,255.7,255.8,255.9,221.0,221.1,221.2,221.3,221.4,221.5,221.6,221.7,221.8,310.0,231.1,231.2,231.3,231.4,231.5,130.0,130.3,130.9,232.1,232.2,232.3,232.4,232.5,232.6,232.7,232.8,793.2,793.5,793.8,329.1,329.2,329.3,329.4,329.5,329.6,329.8,329.9,337.2,337.3,337.4,337.5,337.6,337.7,337.8,337.9,321.1,321.2,321.3,321.6,321.7,194.1,194.2,194.3,194.4,194.5,194.7,194.9,202.2,202.3,202.4,160.1,160.2,160.3,160.4,160.5,160.7,160.8,160.9,784.1,784.3,784.6,784.7,784.8,784.9,357.1,357.2,322.3,322.5,358.8,318.3,789.2,789.7,789.8,334.1,334.2,334.3,334.4,334.6,334.7,396.1,396.2,396.4,396.5,396.6,396.8,396.9,319.3,319.4,319.6,407.1,407.2,419.1,419.4,419.6,419.7,419.9,209.2,209.3,209.4,209.5,209.6,209.7,209.8,209.9,791.1,791.5,791.6,791.8,320.0,320.2,369.0,369.1,369.9,378.5,378.6,378.8,378.9,401.4,401.5,395.1,395.2,395.3,395.4,395.5,394.3,394.4,394.5,394.6,394.7,394.8,324.3,324.4,365.2,365.3,426.1,426.2,426.6,426.8,409.2,409.3,409.4,409.5,409.6,409.7,409.8,409.9,470.0,404.2,445.8,415.5,415.6,415.7,415.9,459.3,459.9,449.3,502.1,502.2,502.3,502.4,350.0,350.1,350.3,350.4,350.5,350.6,350.7,350.8,350.9,246.1,246.2,246.3,246.4,246.5,246.6,246.7,246.8,226.1,333.4,352.8,430.0,479.3,501.5,501.9,238.1,238.2,238.3,238.4,238.5,238.6,238.7,238.8,238.9,363.0,421.2,421.3,421.4,421.5,421.6,421.7,421.8,421.9,528.0,528.1,528.2,528.3,528.5,528.7,528.8,528.9,439.1,439.2,439.4,439.5,439.6,439.7,439.8,439.9,475.5,475.6,475.8,481.1,539.1,539.3,539.4,539.5,539.6,242.4,242.6,242.7,242.8,516.0,516.4,516.5,516.8,492.2,492.3,492.5,492.6,492.8,492.9,795.1,795.2,553.1,553.9,525.41,527.2,527.3,527.4,527.5,377.1,377.2,377.3,377.6,377.8,377.9,748.2,748.5,748.6,748.8,782.3,782.6,782.9,921.1,921.2,921.3,921.4,921.5,921.6,921.7,921.8,921.9,533.1,533.2,533.3,533.6,533.7,533.9,779.6,779.7,779.8,317.2,317.3,317.4,317.5,317.6,317.7,317.8,317.9,261.1,272.1,272.2,272.3,272.4,272.5,272.6,272.7,272.8,272.9,208.2,208.3,208.4,208.5,224.2,224.3,224.4,224.5,224.6,224.7,224.8,224.9,199.4,199.5,199.6,199.7,199.8,199.9,198.1,198.5,198.8,198.9,348.1,348.2,348.3,348.4,348.5,348.6,348.7,348.8,348.9,215.0,215.1,215.2,215.3,215.4,215.5,215.6,215.7,215.8,215.9,292.2,292.3,292.4,292.5,292.6,292.8,292.9,252.1,252.2,252.3,252.4,252.5,252.6,252.7,252.8,252.9,236.2,236.4,236.5,236.7,236.8,236.9,263.0,263.1,263.2,263.3,263.4,263.5,263.7,263.8,521.0,521.1,521.2,521.3,521.4,521.5,521.6,521.7,521.8,521.9,229.1,229.2,229.3,229.4,229.5,229.6,229.7,229.8,229.9,326.0,326.1,326.4,326.5,326.6,326.7,326.9,179.1,179.2,179.4,179.8,264.1,264.3,264.4,264.5,264.6,264.7,264.8,264.9,265.1,265.2,265.3,265.4,265.5,265.7,265.8,265.9,234.1,234.4,234.5,234.6,234.7,234.8,234.9,240.0,293.1,293.2,293.3,293.4,293.5,414.6,414.8,428.3,428.4,428.7,428.8,428.9,555.1,555.2,555.3,555.4,555.5,555.6,555.7,555.8,555.9,296.0,376.1,376.3,376.4,376.5,376.6,376.7,376.8,376.9,227.1,227.2,227.3,227.4,227.5,227.6,227.7,227.9,180.0,180.1,180.3,180.4,180.5,180.7,180.8,325.0,325.1,325.3,325.4,325.5,325.6,325.7,325.8,325.9,925.1,925.2,925.3,925.4,925.5,925.6,925.7,925.8,925.9,480.0,356.1,433.2,433.4,433.5,433.6,433.7,386.2,386.3,386.4,392.1,392.2,392.4,392.5,392.6,366.0,366.3,366.4,366.5,366.9,393.1,393.2,393.3,393.4,393.9,346.1,346.2,346.3,346.5,346.6,346.9,425.1,425.2,425.3,425.5,425.6,425.7,425.8,425.9,244.1,244.3,203.1,203.2,203.3,203.4,203.6,203.7,203.8,349.1,349.2,349.5,349.6,349.7,349.8,349.9,360.0,340.0,340.1,340.3,340.4,340.6,340.7,340.8,390.0,284.2,284.3,284.4,284.5,284.6,284.7,284.8,284.9,344.1,344.5,344.6,344.8,344.9,929.5,300.0,300.2,300.4,300.5,300.6,327.3,327.6,327.8,354.3,354.4,354.5,354.6,354.7,354.8,354.9,297.1,297.3,297.5,297.7,297.8,297.9,323.0,323.2,323.7,338.5,330.0,330.2,330.3,330.4,330.5,330.6,330.7,330.8,796.0,418.4,388.0,388.7,273.1,273.2,273.3,273.4,273.5,273.6,273.7,273.8,273.9,380.0,290.0,290.2,290.3,290.5,290.9,427.1,427.2,427.3,427.4,427.5,427.6,427.7,427.8,260.0,260.1,260.2,260.3,260.4,260.6,260.7,260.8,335.1,335.2,335.3,335.7,335.9,351.2,351.7,448.1,448.2,448.3,448.4,345.1,345.2,345.3,345.5,345.6,345.8,345.9,332.2,332.9,920.0,920.1,920.2,920.3,920.4,920.5,920.6,920.8,920.9,489.3,285.1,285.3,285.4,285.6,287.1,287.2,287.4,287.6,287.7,287.8,250.0,250.1,250.2,250.3,250.5,250.6,250.7,250.8,250.9,281.1,281.2,281.3,281.4,281.5,281.6,281.7,281.8,281.9,341.1,341.8,223.1,223.2,223.3,223.4,223.5,223.6,223.7,223.8,223.9,270.0,514.0,514.1,514.2,514.4,514.5,514.6,514.7,514.8,514.9,384.0,384.4,336.5,336.6,336.7,336.8,336.9,373.4,373.6,373.7,373.8,373.9,282.0,282.5,282.6,282.8,282.9,497.5,510.0,510.2,510.4,510.5,510.6,510.7,510.8,494.2,494.3,494.6,494.8,275.0,275.1,275.2,275.3,275.4,275.5,275.6,275.7,275.8,275.9,786.1,786.3,786.4,786.5,786.9,420.0,420.1,420.2,420.4,420.5,420.6,420.7,420.8,398.1,398.3,398.5,398.7,500.0,794.3,794.4,794.6,794.7,526.1,526.4,526.6,526.7,526.8,361.5,770.2,770.3,770.5,770.6,770.7,370.0,370.3,370.4,370.5,370.6,343.1,343.2,343.3,343.4,343.5,343.6,343.8,343.9,493.1,493.2,342.1,342.2,342.3,342.4,342.5,342.6,342.8,342.9,379.5,379.6,379.7,379.8,379.9,383.2,422.2,422.3,422.4,422.5,422.8,422.9,253.2,253.7,286.1,286.2,286.3,286.4,286.5,286.9,511.0,511.1,511.4,511.5,511.6,511.8,511.9,792.1,792.3,792.5,792.6,792.9,509.0,509.1,509.3,509.5,509.6,509.7,509.8,509.9,780.2,780.5,780.6,785.1,785.2,785.3,785.5,785.6,785.7,785.8,785.9,385.0,385.6,778.2,778.3,778.4,778.6,778.8,778.9,787.1,787.4,254.1,254.2,254.5,254.6,254.7,289.8,788.1,788.2,788.3,788.7,788.9,797.0,797.2,797.5,417.2,417.7,460.0,487.0,487.1,267.2,267.3,267.4,267.5,267.6,267.7,922.1,922.2,922.3,922.4,922.5,922.6,922.7,922.8,922.9,328.1,328.6,328.8,328.9,440.0,440.1,440.9,259.1,259.2,259.3,259.4,259.5,259.6,259.8,301.0,301.7,301.8,495.4,495.8,411.7,374.2,374.4,374.7,374.8,374.9,347.1,347.2,347.5,347.6,347.9,535.1,535.2,535.3,535.4,535.7,535.9,382.9,790.1,757.3,757.4,757.5,757.6,757.7,757.8,339.1,413.1,410.0,410.1,410.9,391.1,391.3,391.5,391.7,783.1,783.3,783.4,783.5,783.6,783.7,783.8,783.9,491.1,491.2,491.3,491.4,491.5,491.9,531.2,531.3,531.4,531.5,531.6,531.8,531.9,771.3,758.3,758.4,758.5,758.7,758.9,799.2,808.0,808.9,809.0,813.0,813.1,815.3,815.4,815.5,815.6,811.1,811.3,811.4,814.1,814.2,814.3,814.4,810.0,810.1,810.2,810.3,810.4,810.6,810.7'.split(',')
// queryDispatcher.query( sparqlQuery ).then( data => {
//     data.results.bindings
//         .map(v => [v.item.value, v.dewey.value])
//         .filter(([id, d]) => deweys.includes(d))
//         .forEach(v => {
//             console.log(`INSERT OR IGNORE INTO data_x_dewey (data_id, dewey_id, real_dewey) VALUES ('${v[0]}', '${v[1]}', '${v[1]}');`)
//             // insert.run({
//             //     url: v[0],
//             //     dewey: "" + v[1]
//             // })
//         })
// } ).catch(console.error)