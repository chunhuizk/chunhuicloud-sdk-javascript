import { GatewayData } from '../GatewayData';

test('GatewayData', () => {
    const testPhysicalId = "GW:abc"
    const testDataSourceId ="DS:abc"
    const newGatewayData = new GatewayData(testPhysicalId)
    expect(newGatewayData.countDataSourceData()).toBe(0);

    newGatewayData.newDataSourceData(testDataSourceId)

    expect(newGatewayData.countDataSourceData()).toBe(1);
});