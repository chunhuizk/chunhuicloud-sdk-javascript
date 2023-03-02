import { ScadaDataReporter, Endpoint } from './ChunhuiCloud';
import IotHub, { IIotHubConfig } from './IotHub';
import * as GatewayDevice from './GatewayDevice/GatewayDevice';

import path = require('path');
export { ScadaDataReporter, IotHub, IIotHubConfig, Endpoint, GatewayDevice };

export function getAWSRootCertificatePath() {
  return path.join(__dirname, 'rootCertificates', 'AmazonRootCA1.pem');
}
