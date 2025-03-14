export type SubstringRule = {
  matchType: "substring";
  substring: string;
};

export type RegexRule = {
  matchType: "regex";
  regex: string;
};

export type BaseRule = SubstringRule | RegexRule;
export type KeepRule = BaseRule & { ruleType: "keep" };
export type DropRule = BaseRule & { ruleType: "drop" };
export type Rule = KeepRule | DropRule;

export type DbUser = {
  username: string;
  passwordHash: string;
};
