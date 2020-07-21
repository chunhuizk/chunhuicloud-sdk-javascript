import { IScadaDataReporterConfig, ScadaDataReporterProtocol } from "../ScadaDataReporter/ScadaDataReporter"
import path = require("path")
import { getAWSRootCertificatePath, ScadaDataReporter } from ".."
import { IotHub as IotHubEndpoints } from '../Endpoint'

const testTopic = "ping"
const mockDevice = {
    SerialNumber: 'test-id',
    Model: 'Test'
}

const scadaDataReporterMqttsConfig: IScadaDataReporterConfig = {
    protocol: ScadaDataReporterProtocol.MQTTS,
    scadaAppId: 'TEST_SCADA_ID',
    endpoint: IotHubEndpoints.Ningxia,
    apiVersion: "20200519",
    mqttConfig: {
        topic: testTopic,
        device: mockDevice,
        certPath: path.join(process.cwd(), 'test_provision_cert_files', 'provinsioned_certs', 'certificate.pem.crt'),
        keyPath: path.join(process.cwd(), 'test_provision_cert_files', 'provinsioned_certs', 'private.pem.key'),
        rootCaPath: getAWSRootCertificatePath()
    }
}

setInterval(() => {
    console.log('SendData', new Date())
    let reporter = new ScadaDataReporter(scadaDataReporterMqttsConfig)

    const GatewayPhysicalId = "12345"
    const SensorOneId = "abcde"
    const mockValue = 100
    const gatewayData = reporter.newGatewayData(GatewayPhysicalId)
    const sensorData1 = gatewayData.newDataSourceData(SensorOneId)
    const timestampDate = new Date()
    sensorData1.setValue(mockValue)
    sensorData1.setTimestamp(timestampDate);

    reporter.send(gatewayData, { mqttTopic: 'ping' })
}, 3000)