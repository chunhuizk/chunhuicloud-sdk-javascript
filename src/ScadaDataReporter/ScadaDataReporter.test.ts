import { ScadaDataReporter } from './ScadaDataReporter';

test('ScadaDataReporter Default Config', () => {
    const reporter = new ScadaDataReporter()

    expect(reporter.config.protocol).toBe("HTTPS")
    expect(reporter.config.endpoint).toBeTruthy()
    expect(reporter.config.apiVersion).toBeTruthy()
    expect(reporter.config.mqttConfig).toBeUndefined()
});

test('ScadaDataReporter Https Data Process', () => {
    const reporter = new ScadaDataReporter()
    const GatewayPhysicalId = "12345"
    const SensorOneId = "abcde"
    const mockValue = 100
    const gatewayData = reporter.newGatewayData(GatewayPhysicalId)
    const sensorData1 = gatewayData.newDataSourceData(SensorOneId)
    const timestampDate = new Date()
    sensorData1.setValue(mockValue)
    sensorData1.setTimestamp(timestampDate);

    expect(sensorData1.toMetricData()).toStrictEqual({
        Dimensions:[{Name: "DataSourceId", Value: SensorOneId}],
        Metas: [],
        Timestamp: timestampDate,
        Value: mockValue
    })

    expect(gatewayData.countDataSourceData()).toBe(1)

    expect(gatewayData.toMetricDatas()).toStrictEqual([{
        Dimensions:[{Name: "DataSourceId", Value: SensorOneId}],
        Metas: [],
        Timestamp: timestampDate,
        Value: mockValue
    }])
});

test('ScadaDataReporter Mqtt Config', () => {
    const reporter = new ScadaDataReporter()

    expect(reporter.config.protocol).toBe("HTTPS")
    expect(reporter.config.endpoint).toBeTruthy()
    expect(reporter.config.apiVersion).toBeTruthy()
    expect(reporter.config.mqttConfig).toBeUndefined()
});