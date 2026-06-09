-- Force category-local priority_rank for canonical 25-ticker watchlist (idempotent).

UPDATE public.watchlist SET watchlist_category = 'ETF', priority_rank = 1, sort_order = 0
WHERE UPPER(ticker) = 'XSP';

UPDATE public.watchlist SET watchlist_category = 'ETF', priority_rank = 2, sort_order = 1
WHERE UPPER(ticker) = 'MGK';

UPDATE public.watchlist SET watchlist_category = 'ETF', priority_rank = 3, sort_order = 2
WHERE UPPER(ticker) = 'QQQ';

UPDATE public.watchlist SET watchlist_category = 'ETF', priority_rank = 4, sort_order = 3
WHERE UPPER(ticker) = 'IWM';

UPDATE public.watchlist SET watchlist_category = 'ETF', priority_rank = 5, sort_order = 4
WHERE UPPER(ticker) = 'GLD';

UPDATE public.watchlist SET watchlist_category = 'SECTOR_LEADER', priority_rank = 1, sort_order = 5
WHERE UPPER(ticker) = 'JPM';

UPDATE public.watchlist SET watchlist_category = 'SECTOR_LEADER', priority_rank = 2, sort_order = 6
WHERE UPPER(ticker) = 'CAT';

UPDATE public.watchlist SET watchlist_category = 'SECTOR_LEADER', priority_rank = 3, sort_order = 7
WHERE UPPER(ticker) = 'WMT';

UPDATE public.watchlist SET watchlist_category = 'SECTOR_LEADER', priority_rank = 4, sort_order = 8
WHERE UPPER(ticker) = 'UNH';

UPDATE public.watchlist SET watchlist_category = 'SECTOR_LEADER', priority_rank = 5, sort_order = 9
WHERE UPPER(ticker) = 'XOM';

UPDATE public.watchlist SET watchlist_category = 'SECTOR_LEADER', priority_rank = 6, sort_order = 10
WHERE UPPER(ticker) = 'HD';

UPDATE public.watchlist SET watchlist_category = 'TOP7', priority_rank = 1, sort_order = 11
WHERE UPPER(ticker) = 'AAPL';

UPDATE public.watchlist SET watchlist_category = 'TOP7', priority_rank = 2, sort_order = 12
WHERE UPPER(ticker) = 'MSFT';

UPDATE public.watchlist SET watchlist_category = 'TOP7', priority_rank = 3, sort_order = 13
WHERE UPPER(ticker) = 'NVDA';

UPDATE public.watchlist SET watchlist_category = 'TOP7', priority_rank = 4, sort_order = 14
WHERE UPPER(ticker) = 'AVGO';

UPDATE public.watchlist SET watchlist_category = 'TOP7', priority_rank = 5, sort_order = 15
WHERE UPPER(ticker) = 'AMZN';

UPDATE public.watchlist SET watchlist_category = 'TOP7', priority_rank = 6, sort_order = 16
WHERE UPPER(ticker) = 'META';

UPDATE public.watchlist SET watchlist_category = 'TOP7', priority_rank = 7, sort_order = 17
WHERE UPPER(ticker) = 'GOOG';

UPDATE public.watchlist SET watchlist_category = 'PULLBACK', priority_rank = 1, sort_order = 18
WHERE UPPER(ticker) = 'TMUS';

UPDATE public.watchlist SET watchlist_category = 'PULLBACK', priority_rank = 2, sort_order = 19
WHERE UPPER(ticker) = 'NFLX';

UPDATE public.watchlist SET watchlist_category = 'PULLBACK', priority_rank = 3, sort_order = 20
WHERE UPPER(ticker) = 'PG';

UPDATE public.watchlist SET watchlist_category = 'PULLBACK', priority_rank = 4, sort_order = 21
WHERE UPPER(ticker) = 'V';

UPDATE public.watchlist SET watchlist_category = 'PULLBACK', priority_rank = 5, sort_order = 22
WHERE UPPER(ticker) = 'MA';

UPDATE public.watchlist SET watchlist_category = 'PULLBACK', priority_rank = 6, sort_order = 23
WHERE UPPER(ticker) = 'ACN';

UPDATE public.watchlist SET watchlist_category = 'PULLBACK', priority_rank = 7, sort_order = 24
WHERE UPPER(ticker) = 'INTU';
