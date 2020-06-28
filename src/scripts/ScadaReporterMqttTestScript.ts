import path = require("path")
import fs = require("fs")
import {
    IIotHubConfig,
    ScadaDataReporter,
    IotHub, getAWSRootCertificatePath, Endpoint
} from ".."
import { IScadaDataReporterConfig, ScadaDataReporterProtocol } from "../ScadaDataReporter/ScadaDataReporter"


const testEndpoint = Endpoint.IotHub.Virginia
const serialNumber = 'test-id'
const model = "Test"
const topic = "test/message"
const provisionTemplateName = "CHUNHUIZK_SCADA_PROVISION_V1"

const config: IScadaDataReporterConfig = {
    protocol: ScadaDataReporterProtocol.MQTT,
    endpoint: testEndpoint,
    mqttConfig: {
        topic: topic,
        device: {
            Model: model,
            SerialNumber: serialNumber
        },
        certPath: path.join(process.cwd(), 'test_provision_cert_files', 'provinsioned_certs', 'certificate.pem.crt'),
        keyPath: path.join(process.cwd(), 'test_provision_cert_files', 'provinsioned_certs', 'private.pem.key'),
        rootCaPath: getAWSRootCertificatePath(),
        provisionCertPath: path.join(process.cwd(), 'test_provision_cert_files', 'd36d6a6096-certificate.pem.crt'),
        provisionKeyPath: path.join(process.cwd(), 'test_provision_cert_files', 'd36d6a6096-private.pem.key'),
        provisionTemplateName
    }
}


const reporter = new ScadaDataReporter(config)

try {
    

} catch (err) {
    throw err
}