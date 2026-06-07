/**
 * KSE-100 constituent symbols as of Q1 2026.
 * The index is rebalanced quarterly — update by running:
 *   python -c "import psxdata; print(psxdata.tickers(index='KSE100'))"
 */
export const KSE100_SYMBOLS = new Set([
  // Banks
  "HBL", "MCB", "UBL", "ABL", "BAHL", "MEBL", "NBP", "BOP",
  "BAFL", "AKBL", "JSBL", "BIPL", "SCBPL", "SNBL", "FABL", "SILK",

  // Cement
  "LUCK", "PIOC", "CHCC", "MLCF", "FCCL", "DGKC", "ACPL", "KOHC",
  "BWCL", "POWER", "FLYNG",

  // Oil & Gas
  "OGDC", "PPL", "PSO", "SNGP", "SSGC", "APL", "ATRL", "NRL",
  "PRL", "PNSC",

  // Fertilizer
  "ENGRO", "FFC", "FFBL", "EFERT", "FATIMA", "DAWH",

  // Power
  "HUBCO", "KAPCO", "NCPL", "PKGP", "LALPIR", "KEL", "EPQL",
  "KOHP", "CEPB",

  // Technology & Telecom
  "TRG", "SYS", "NETSOL", "AVN", "PTC",

  // Automobiles
  "HCAR", "PSMC", "INDU", "ATLH", "MTL", "AGTL",

  // Food & Consumer
  "NESTLE", "UNITY", "COLG", "UNILEVER", "TREET", "PAKT",

  // Steel & Engineering
  "ASTL", "MUGHAL", "ISL", "INIL", "SIEM",

  // Chemicals & Polymers
  "ICI", "LOTCHEM", "EPCL", "SITC",

  // Textile
  "KTML", "NRSL", "GADT", "THALL",

  // Pharmaceuticals
  "SEARL", "FEROZ", "IBFL",

  // Insurance
  "IGIIL", "AICL", "JGICL",

  // Misc
  "GGL", "GHNI", "GHNL", "HUMNL", "GRPH", "PAEL",
]);
