import { DataSourceData } from './DataSourceData';
import { IMetricData } from './types';

export class GatewayData {
  protected gatewayPhysicalId: string;
  protected datas: {
    [dataSourceId: string]: DataSourceData;
  } = {};

  constructor(gatewayPhysicalId: string) {
    this.gatewayPhysicalId = gatewayPhysicalId;
  }

  newDataSourceData(dataSourceId: string): DataSourceData {
    this.datas[dataSourceId] = new DataSourceData(dataSourceId);
    return this.datas[dataSourceId];
  }

  toMetricDatas(): IMetricData[] {
    const dataCount = this.countDataSourceData()
    if (dataCount > 20) {
      throw new Error(`Maxium of 20 datasource data can be handled at once, currently have: ${dataCount}`)
    }
    return Object.keys(this.datas).map((dataSourceId) => this.datas[dataSourceId].toMetricData());
  }

  getGatewayPhysicalId(): string {
    return this.gatewayPhysicalId;
  }

  countDataSourceData(): number {
    return Object.keys(this.datas).length
  }
}
