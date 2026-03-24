from __future__ import annotations

import unittest
from io import BytesIO
from pathlib import Path
import sys

from openpyxl import load_workbook

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.excel_export.exporter import export_dcf_excel


def _is_formula(value: object) -> bool:
    return isinstance(value, str) and value.startswith("=")


def _build_apple_payload() -> dict:
    historical_years = [2022, 2023, 2024]
    forecast_years = [2025, 2026, 2027, 2028, 2029]
    forecast_revenues = [410_586, 427_009, 440_246, 453_453, 467_057]
    forecast_fcff = [108_500, 112_200, 115_000, 117_700, 120_400]
    discount_factors = [0.91, 0.83, 0.76, 0.69, 0.63]
    pv_fcff = [98_735, 93_126, 87_400, 81_213, 75_852]

    forecasts = []
    for idx, year in enumerate(forecast_years):
        forecasts.append(
            {
                "year": year,
                "revenue": forecast_revenues[idx],
                "revenueGrowth": 0.05 if idx == 0 else 0.03,
                "costOfRevenue": 220_000 + idx * 7_400,
                "grossProfit": forecast_revenues[idx] - (220_000 + idx * 7_400),
                "grossMargin": 0.464,
                "ebitda": 145_000 + idx * 4_900,
                "ebitdaMargin": 0.353,
                "ebit": 133_000 + idx * 4_650,
                "ebitMargin": 0.324,
                "interestExpense": 4_300,
                "preTaxIncome": 128_700 + idx * 4_400,
                "taxExpense": 24_500 + idx * 875,
                "effectiveTaxRate": 0.19,
                "netIncome": 104_200 + idx * 3_775,
                "netMargin": 0.255,
                "rdExpense": 32_800 + idx * 1_100,
                "sgaExpense": 26_600 + idx * 850,
                "depreciation": 12_000 + idx * 300,
                "stockBasedComp": 0,
                "capex": 11_500 + idx * 300,
                "nwcChange": 1_500 if idx < 3 else 1_400,
                "cfo": 120_000 + idx * 3_250,
                "fcff": forecast_fcff[idx],
                "discountFactor": discount_factors[idx],
                "pvFcff": pv_fcff[idx],
                "cash": 36_000 + idx * 1_625,
                "totalCurrentAssets": 158_000 + idx * 3_750,
                "otherCurrentAssets": 0,
                "ppeNet": 47_000 + idx * 1_500,
                "otherAssets": 49_000 + idx * 1_000,
                "totalAssets": 372_000 + idx * 8_375,
                "totalDebt": 106_000 - idx * 2_000,
                "currentDebt": 10_000 if idx < 2 else 8_000,
                "shortTermDebt": 10_000 if idx < 2 else 8_000,
                "longTermDebt": 96_000 - idx * 1_500,
                "otherLiabilities": 51_000 + idx * 500,
                "deferredRevenue": 0,
                "otherCurrentLiabilities": 61_000 + idx * 1_000,
                "totalCurrentLiabilities": 152_000 + idx * 1_000,
                "nonCurrentLiabilities": 0,
                "commonStock": 0,
                "retainedEarnings": 0,
                "shareholdersEquity": 76_000 + idx * 2_875,
                "investedCapital": 0,
                "roic": 0,
                "economicProfit": 0,
                "accountsReceivable": 0,
                "inventory": 0,
                "accountsPayable": 0,
                "nwc": 0,
                "dividends": 0,
                "shareBuybacks": 0,
                "debtIssuance": 0,
                "debtRepayment": 0,
                "totalLiabilities": 296_000 + idx * 5_500,
                "taxShieldUsed": 0,
                "nolBalance": 0,
                "isStub": False,
            }
        )

    return {
        "company": {
            "name": "Apple Inc.",
            "ticker": "AAPL",
            "exchange": "NASDAQ",
            "cik": "0000320193",
            "currency": "USD",
            "unitsScale": "millions",
            "asOfDate": "2025-09-28",
            "fiscalYearEnd": "September 28",
            "sector": "Technology",
            "industry": "Consumer Electronics",
        },
        "market": {
            "sharesDiluted": 15_100,
            "currentPrice": 230.0,
            "marketCap": 3_473_000,
            "debt": 106_000,
            "cash": 62_000,
            "netDebt": 44_000,
            "beta": 1.24,
            "nonOperatingAssets": 0,
        },
        "historicals": {
            "years": historical_years,
            "income": {
                "Total Revenue": [394_328, 383_285, 391_035],
                "Cost of Revenue": [223_546, 214_137, 210_352],
                "Gross Profit": [170_782, 169_148, 180_683],
                "Research & Development": [26_251, 29_915, 31_370],
                "SG&A": [25_094, 24_932, 26_097],
                "D&A (included in Operating)": [11_104, 11_519, 11_600],
                "Operating Income (EBIT)": [119_437, 114_301, 123_216],
                "Interest Expense": [2_931, 3_933, 4_200],
                "Income Taxes": [19_300, 16_741, 19_000],
                "Net Income": [99_803, 96_995, 104_000],
            },
            "balance": {
                "Cash & Cash Equivalents": [23_646, 29_965, 34_000],
                "Total Current Assets": [135_405, 143_566, 152_000],
                "Property, Plant & Equipment": [42_117, 43_715, 45_500],
                "Other Non-Current Assets": [54_428, 46_906, 48_000],
                "Total Assets": [352_755, 352_583, 365_000],
                "Short-term Debt": [9_982, 10_912, 10_000],
                "Accounts Payable": [64_115, 62_611, 65_000],
                "Other Current Liabilities": [60_845, 58_829, 60_000],
                "Total Current Liabilities": [153_982, 145_308, 150_000],
                "Long-term Debt": [98_959, 95_281, 96_000],
                "Other Non-Current Liabilities": [49_142, 49_848, 50_000],
                "Total Liabilities": [302_083, 290_437, 296_000],
                "Total Shareholders' Equity": [50_672, 62_146, 69_000],
                "Retained Earnings": [0, 0, 0],
            },
            "cashflow": {
                "Net Income": [99_803, 96_995, 104_000],
                "Depreciation & Amortization": [11_104, 11_519, 11_600],
                "Cash Flow from Operations": [122_151, 110_543, 118_000],
                "Capital Expenditures": [-10_708, -10_959, -11_500],
                "Free Cash Flow (FCFF)": [111_443, 99_584, 106_500],
            },
        },
        "forecasts": forecasts,
        "assumptions": {
            "waccRate": 0.098,
            "taxRate": 0.19,
            "daPctRevenue": 0.029,
            "deaRatio": 0.029,
            "terminalGrowthRate": 0.025,
            "terminalExitMultiple": 24,
            "capexRatio": 0.028,
            "nwcChangeRatio": 0.003,
            "grossMargin": 0.464,
            "ebitMargin": 0.324,
            "ebitdaMargin": 0.353,
            "rdMargin": 0.08,
            "sgaMargin": 0.065,
            "revenueGrowth": 0.05,
            "forecastYears": 5,
            "accountsReceivableDays": 30,
            "inventoryDays": 10,
            "accountsPayableDays": 85,
            "terminal": {"g": 0.025, "exitMultiple": 24, "method": "Perpetuity"},
            "wacc": {"rf": 0.044, "erp": 0.05, "beta": 1.24, "costOfDebt": 0.051, "waccRate": 0.098},
        },
        "uiMeta": {
            "keyMetrics": {
                "enterpriseValue": 3_517_000,
                "equityValue": 3_473_000,
                "terminalValue": 2_500_000,
                "pvTerminalValue": 1_900_000,
                "impliedUpside": 0.12,
            }
        },
        "sensitivities": {
            "waccAxis": [0.078, 0.088, 0.098, 0.108, 0.118],
            "terminalGrowthAxis": [0.015, 0.020, 0.025, 0.030, 0.035],
            "waccTerminalEvMatrix": [
                [3_200_000, 3_240_000, 3_280_000, 3_320_000, 3_360_000],
                [3_300_000, 3_340_000, 3_380_000, 3_420_000, 3_460_000],
                [3_400_000, 3_450_000, 3_517_000, 3_580_000, 3_640_000],
                [3_500_000, 3_540_000, 3_580_000, 3_620_000, 3_660_000],
                [3_600_000, 3_640_000, 3_680_000, 3_720_000, 3_760_000],
            ],
            "revenueGrowthAxis": [0.03, 0.04, 0.05, 0.06, 0.07],
            "ebitMarginAxis": [0.304, 0.314, 0.324, 0.334, 0.344],
            "revenueEbitEvMatrix": [
                [3_200_000, 3_240_000, 3_280_000, 3_320_000, 3_360_000],
                [3_300_000, 3_340_000, 3_380_000, 3_420_000, 3_460_000],
                [3_400_000, 3_450_000, 3_517_000, 3_580_000, 3_640_000],
                [3_500_000, 3_540_000, 3_580_000, 3_620_000, 3_660_000],
                [3_600_000, 3_640_000, 3_680_000, 3_720_000, 3_760_000],
            ],
        },
        "scenarios": {
            "base": {
                "assumptions": {
                    "waccRate": 0.098,
                    "taxRate": 0.19,
                    "daPctRevenue": 0.029,
                    "terminalGrowthRate": 0.025,
                    "terminalExitMultiple": 24,
                    "capexRatio": 0.028,
                    "nwcChangeRatio": 0.003,
                },
                "summary": {
                    "enterpriseValue": 3_517_000,
                    "equityValue": 3_473_000,
                    "impliedSharePrice": 258.0,
                    "upside": 0.12,
                },
                "forecasts": [],
            },
            "bull": {
                "assumptions": {
                    "waccRate": 0.093,
                    "taxRate": 0.19,
                    "daPctRevenue": 0.029,
                    "terminalGrowthRate": 0.03,
                    "terminalExitMultiple": 25,
                    "capexRatio": 0.027,
                    "nwcChangeRatio": 0.0025,
                    "beta": 1.18,
                },
                "summary": {
                    "enterpriseValue": 3_800_000,
                    "equityValue": 3_756_000,
                    "impliedSharePrice": 278.0,
                    "upside": 0.21,
                },
                "forecasts": [],
            },
            "bear": {
                "assumptions": {
                    "waccRate": 0.103,
                    "taxRate": 0.19,
                    "daPctRevenue": 0.029,
                    "terminalGrowthRate": 0.02,
                    "terminalExitMultiple": 23,
                    "capexRatio": 0.029,
                    "nwcChangeRatio": 0.0035,
                    "beta": 1.30,
                },
                "summary": {
                    "enterpriseValue": 3_250_000,
                    "equityValue": 3_206_000,
                    "impliedSharePrice": 238.0,
                    "upside": 0.03,
                },
                "forecasts": [],
            },
        },
    }


class ExcelExportWorkbookTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        workbook_bytes = export_dcf_excel(_build_apple_payload())
        cls.workbook = load_workbook(BytesIO(workbook_bytes), data_only=False)

    def test_core_model_cells_remain_formula_driven(self) -> None:
        outputs = self.workbook["Outputs - Base"]
        base = self.workbook["DCF Model - Base (1)"]
        bull = self.workbook["DCF Model - Bull (2)"]
        bear = self.workbook["DCF Model - Bear (3)"]
        wacc = self.workbook["WACC"]

        for cell_ref in ("E18", "D36", "D37", "D38", "D41"):
            self.assertTrue(_is_formula(outputs[cell_ref].value), cell_ref)

        for cell_ref in ("C9", "C10", "C12", "Q94", "Q98", "Q111"):
            self.assertTrue(_is_formula(base[cell_ref].value), cell_ref)

        self.assertTrue(_is_formula(bull["F12"].value))
        self.assertTrue(_is_formula(bear["F12"].value))

        for cell_ref in ("D16", "D21", "D34", "D35", "D36", "D39", "D40"):
            self.assertTrue(_is_formula(wacc[cell_ref].value), cell_ref)

    def test_sensitivity_axes_use_live_excel_cells_not_text_labels(self) -> None:
        base = self.workbook["DCF Model - Base (1)"]

        for cell_ref in ("D119", "E119", "G119", "H119", "C120", "C121", "C123", "C124"):
            self.assertTrue(_is_formula(base[cell_ref].value), cell_ref)
            self.assertEqual(base[cell_ref].number_format, "0.0%")

        for cell_ref in ("F119", "C122", "L119", "I122"):
            self.assertIsInstance(base[cell_ref].value, float, cell_ref)
            self.assertEqual(base[cell_ref].number_format, "0.0%")

        for cell_ref in ("J119", "K119", "M119", "N119", "I120", "I121", "I123", "I124"):
            self.assertTrue(_is_formula(base[cell_ref].value), cell_ref)
            self.assertEqual(base[cell_ref].number_format, "0.0%")

    def test_year_headers_are_explicit_labels(self) -> None:
        base = self.workbook["DCF Model - Base (1)"]
        outputs = self.workbook["Outputs - Base"]

        self.assertEqual(base["K18"].value, "FY2025E")
        self.assertEqual(base["Q89"].value, "FY2031E")
        self.assertEqual(outputs["K6"].value, "FY2025E")


if __name__ == "__main__":
    unittest.main()
