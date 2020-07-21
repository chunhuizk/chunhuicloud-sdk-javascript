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

const reporterListener = new ScadaDataReporter(scadaDataReporterMqttsConfig)

reporterListener.getMtqqConnection().then((device) => {

    reporterListener.subscribeTopicWithHandler('ping', (data: any) => {
        console.log('receivce from ping, data', data, new Date())
    })

    device.on('connect', () => {
        console.log('connect!')
    })
})



// reporterListener.getMtqqConnection().then((device) => {
//     device.subscribe('pong', { qos: 1 })
//     device.on('connect', () => {
//         console.log('connect!')
//     })
//     device.on('message', (topic: string, payload: any) => {
//         const decoder = new TextDecoder('utf-8')
//         console.log(topic, decoder.decode(payload))
//     })

//     device.on('error', (error) => {
//         console.log(error)
//     })

//     device.on('close', () => {
//         console.log('close')
//     })

//     device.on('reconnect', () => {
//         console.log('reconnect')
//     })


//     device.on('offline', () => {
//         console.log('offline')
//     })
// })

// setInterval(() => {
//     console.log('SendData', new Date())
//     let reporter = new ScadaDataReporter(scadaDataReporterMqttsConfig)

//     const GatewayPhysicalId = "12345"
//     const SensorOneId = "abcde"
//     const mockValue = 100
//     const gatewayData = reporter.newGatewayData(GatewayPhysicalId)
//     const sensorData1 = gatewayData.newDataSourceData(SensorOneId)
//     const timestampDate = new Date()
//     sensorData1.setValue(mockValue)
//     sensorData1.setTimestamp(timestampDate);

//     reporter.send(gatewayData, { mqttTopic: 'ping' })
// }, 3000)