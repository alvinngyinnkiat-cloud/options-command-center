-- Phase 1: Shared enum types

CREATE TYPE public.timeframe_type AS ENUM ('daily', 'weekly');

CREATE TYPE public.strategy_type AS ENUM (
  'bull_put_spread',
  'bear_call_spread',
  'iron_condor'
);

CREATE TYPE public.trade_status AS ENUM ('open', 'closing', 'closed');

CREATE TYPE public.asset_type AS ENUM ('stock', 'option', 'etf', 'other');

CREATE TYPE public.goal_type AS ENUM (
  'income',
  'allocation',
  'net_worth',
  'risk_capacity',
  'custom'
);

CREATE TYPE public.alert_type AS ENUM (
  'price',
  'trade',
  'risk',
  'expiration',
  'system'
);

CREATE TYPE public.report_type AS ENUM (
  'performance',
  'monthly',
  'strategy_breakdown',
  'risk_summary',
  'custom'
);

CREATE TYPE public.scanner_action AS ENUM (
  'enter',
  'watch',
  'avoid',
  'hold',
  'exit'
);
