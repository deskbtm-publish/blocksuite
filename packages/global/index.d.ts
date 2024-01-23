declare type BlockSuiteFlags = {
  enable_legacy_validation: boolean;
  enable_expand_database_block: boolean;
  enable_builtin_ledits: boolean;
  readonly: Record<string, boolean>;
};
