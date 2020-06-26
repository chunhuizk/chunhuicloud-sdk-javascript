import { ScadaDataReporter, Endpoint } from './ChunhuiCloud'
import IotHub, { IIotHubConfig } from './IotHub'
import path = require('path')
export { ScadaDataReporter, IotHub, IIotHubConfig, Endpoint }

export function getAWSRootCertificatePath() {
    return path.join(__dirname, 'rootCertificates', 'AmazonRootCA1.pem')
}