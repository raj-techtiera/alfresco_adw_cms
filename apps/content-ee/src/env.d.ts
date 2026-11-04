// Define the type of environment variables injected by @ngx-env/builder.
declare interface Env {
  readonly NODE_ENV: string;
  readonly NG_APP_ENV: string;
  readonly NG_APP_NODE_ID: string;
  readonly NG_APP_BUSINESS_UNITS_NODE_ID: string;
  readonly NG_APP_CREATE_BUSINESS_UNIT_PROCESS_DEFINITION_KEY: string;
  readonly NG_APP_CREATE_BUSINESS_UNIT_PROCESS_NAME: string;
  readonly NG_APP_CREATE_BUSINESS_UNIT_BUSINESS_KEY: string;
  readonly NG_APP_IMAGE_NODE_ID: string;
  readonly NG_APP_ASSETS_NODE_ID: string;
  readonly NG_APP_ASSETS_TEMPLATE_ID: string;
  readonly NG_APP_VENDOR_LIST_PARENT_NODE_ID: string;
  readonly NG_APP_PROGRAMS_PARENT_NODE_ID: string;
  readonly NG_APP_DOCUMENT_MANAGEMENT_NODE_ID: string;
  readonly NG_APP_EDMS_CENTRAL_SITE_ID: string;
  readonly NG_APP_WATERMARK_TEMPLATE_NODE_TYPE: string;
  readonly NG_APP_WATERMARK_TEXT_RELATIVE_PATH: string;
  readonly NG_APP_WATERMARK_IMAGE_RELATIVE_PATH: string;
  readonly NG_APP_PROCESS_INSTANCES_URL: string;
  readonly NG_APP_CREATE_ASSET_PROCESS_DEFINITION_KEY: string;
  readonly NG_APP_CREATE_PROJECT_PROCESS_DEFINITION_KEY: string;
  readonly NG_APP_CREATE_PROGRAM_PROCESS_DEFINITION_KEY: string;
  readonly NG_APP_CREATE_PROGRAM_BUSINESS_KEY: string;
  readonly NG_APP_CREATE_PO_PROCESS_DEFINITION_KEY: string;
  readonly NG_APP_HANDOVER_GAP_REPORT_PROCESS_DEFINITION_KEY: string;
  readonly NG_APP_FINAL_HANDOVER_PROCESS_DEFINITION_KEY: string;
  readonly NG_APP_BULK_PROCESS_DEFINITION_KEY: string;
  readonly NG_APP_BULK_PROXY_REGISTRATION_PROCESS_DEFINITION_KEY: string;
  readonly NG_APP_DOCUMENT_NUMBER_CHANGE_PROCESS_DEFINITION_KEY: string;
  readonly NG_APP_RED_LINE_MARKUP_PROCESS_DEFINITION_KEY: string;
  readonly NG_APP_RED_LINE_MARKUP_PROCESS_NAME: string;
  readonly NG_APP_RED_LINE_MARKUP_BUSINESS_KEY: string;
  readonly NG_APP_JR_REQUEST_PROCESS_DEFINITION_KEY: string;
  readonly NG_APP_JR_REQUEST_BUSINESS_KEY: string;
  readonly NG_APP_CARTO_API_KEY: string;
  readonly NG_APP_LOGO_URL: string;
  readonly NG_APP_LOGO_IMAGE_URL: string;
  [key: string]: any;
}

declare interface ImportMeta {
  readonly env: Env;
}

declare const _NGX_ENV_: Env;

declare namespace NodeJS {
  export interface ProcessEnv extends Env {}
}

declare module 'jszip' {
  const JSZip: any;
  export = JSZip;
}

declare module 'pdf-lib';
