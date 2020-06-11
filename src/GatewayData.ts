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
    return Object.keys(this.datas).map((dataSourceId) => this.datas[dataSourceId].toMetricData());
  }

  getGatewayPhysicalId(): string {
    return this.gatewayPhysicalId;
  }

  countDataSourceData(): number {
    return Object.keys(this.datas).length
  }
}
