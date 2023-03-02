import path = require('path');
import fs = require('fs');
import { IIotHubConfig, ScadaDataReporter, IotHub, getAWSRootCertificatePath, Endpoint } from '..';
import { IScadaDataReporterConfig, ScadaDataReporterProtocol } from '../ScadaDataReporter/ScadaDataReporter';

const testEndpoint = Endpoint.IotHub.Ningxia;
const serialNumber = 'test-id';
const model = 'Test';
const topic = 'test/message';
const provisionTemplateName = 'CHUNHUIZK_SCADA_PROVISION_V1';

const config: IScadaDataReporterConfig = {
  protocol: ScadaDataReporterProtocol.MQTTS,
  endpoint: testEndpoint,
  mqttConfig: {
    topic,
    device: {
      Model: model,
      SerialNumber: serialNumber,
    },
    certPath: path.join(process.cwd(), 'test_provision_cert_files', 'provinsioned_certs', 'certificate.pem.crt'),
    keyPath: path.join(process.cwd(), 'test_provision_cert_files', 'provinsioned_certs', 'private.pem.key'),
    rootCaPath: getAWSRootCertificatePath(),
    provisionCertPath: path.join(process.cwd(), 'test_provision_cert_files', 'd36d6a6096-certificate.pem.crt'),
    provisionKeyPath: path.join(process.cwd(), 'test_provision_cert_files', 'd36d6a6096-private.pem.key'),
    provisionTemplateName,
  },
};
