export type IReportDataFull = Required<IReportData>;

export interface IReportData {
  Version?: string; // Data Schema Version
  ScadaAppId?: string;
  Timestamp?: Date;
  Secret?: string;
  GatewayId?: string; // Optional Iot Gatewat UniqueId
  GatewayPhysicalId?: string;
}

export interface IGatewayReportData extends IReportData {
  InfoData?: IInfoData;
  ErrorData?: IGatewayErrorData;
  MetricData?: IMetricData[];
}

export enum IInfoName {
  REGISTER = 'REGISTER',
}

export interface IInfoData {
  Name?: string | IInfoName;
  Message: string;
}

export interface IGatewayErrorData extends IInfoData {
  Stack?: string;
}

export type Unit = 'Count';

export interface IStatisticalValue {
  Max: number;
  Min: number;
  SampleCount: number;
  Sum: number;
}

export interface IDimension {
  Name: string;
  Value: string;
}

export interface IMetricData {
  Value?: number;
  Values?: number[];
  Counts?: number[];
  Unit?: Unit;
  StatisticalValue?: IStatisticalValue;
  Timestamp: Date;
  Dimensions?: IDimension[];
}
