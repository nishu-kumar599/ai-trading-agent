/**
 * Indian Stock Market (NSE / BSE) IPO Intelligence Engine
 * Comprehensive data, GMP tracking, subscription breakdown, AI sentiment, and Paper Bidding Simulator
 */

// In-memory paper bids store
let userPaperBids = [
  {
    id: 'BID_101',
    ipoId: 'IPO_WAAREE_ENER',
    companyName: 'Waaree Energies Ltd',
    symbol: 'WAAREE',
    appliedDate: '2026-09-24',
    category: 'RETAIL',
    lots: 2,
    shares: 30, // 15 shares per lot
    bidPrice: 1503,
    totalBlocked: 45090,
    upiId: 'trader@okhdfcbank',
    allotmentStatus: 'ALLOTTED', // PENDING, ALLOTTED, NOT_ALLOTTED
    listingStatus: 'LISTED', // UPCOMING, LISTED
    allottedShares: 15, // 1 lot allotted
    listingPrice: 2550,
    listingGainPct: 69.66,
    realizedPL: 15705,
    pnlRealized: true,
    allotmentOdds: '1 in 4 (25.0%)'
  }
];

const IPO_DATASET = [
  // ================= OPEN / ACTIVE IPOS =================
  {
    id: 'IPO_NTPC_GREEN',
    name: 'NTPC Green Energy Ltd',
    symbol: 'NTPCGREEN',
    category: 'MAINBOARD',
    status: 'OPEN', // OPEN, UPCOMING, LISTED
    badge: 'CLOSES TOMORROW',
    sector: 'Renewable & Clean Energy',
    exchange: 'BSE, NSE',
    openDate: '2026-09-26',
    closeDate: '2026-09-29',
    allotmentDate: '2026-09-30',
    listingDate: '2026-10-03',
    priceRange: { min: 102, max: 108 },
    lotSize: 138,
    minInvestment: 14904, // 138 * 108
    issueSize: 10000, // In Crores
    freshIssue: 10000,
    ofs: 0,
    gmp: {
      value: 24,
      percentage: 22.22,
      expectedListingPrice: 132,
      trend: 'EXPANDING', // EXPANDING, STABLE, FALLING
      updatedAt: '10 mins ago'
    },
    subscription: {
      overall: 4.82,
      qib: 7.15,
      nii: 5.40,
      retail: 2.95,
      employee: 1.80
    },
    aiRating: {
      verdict: 'STRONG APPLY',
      score: 91,
      tag: 'High Green-Energy Growth',
      summary: 'Backed by Maharatna PSU parent NTPC. 100% fresh issue dedicated to debt reduction and gigawatt expansion. Exceptional operational pipeline with robust long-term PPA visibility.',
      strengths: [
        'Largest renewable energy public sector enterprise in India.',
        'Zero OFS; entire ₹10,000 Cr goes toward Capex and balance sheet de-leveraging.',
        'Strong sovereign backing with contracted 25-year PPAs at predictable tariffs.'
      ],
      risks: [
        'Capital intensive sector sensitive to interest rate fluctuations.',
        'High dependence on solar module raw material price volatility.'
      ],
      financials: {
        revenue3YCAGR: '46.8%',
        ebitdaMargin: '78.2%',
        patMargin: '21.4%',
        peRatio: 38.5,
        industryPE: 45.2,
        debtToEquity: '1.42',
        ronw: '11.8%'
      },
      peers: [
        { name: 'Adani Green Energy', pe: 112.4, pb: 28.5 },
        { name: 'Tata Power', pe: 34.8, pb: 4.2 },
        { name: 'JSW Energy', pe: 42.1, pb: 3.9 }
      ]
    }
  },
  {
    id: 'IPO_SWIGGY',
    name: 'Swiggy Ltd',
    symbol: 'SWIGGY',
    category: 'MAINBOARD',
    status: 'OPEN',
    badge: 'HIGH DEMAND',
    sector: 'Consumer Tech & Quick Commerce',
    exchange: 'BSE, NSE',
    openDate: '2026-09-27',
    closeDate: '2026-09-30',
    allotmentDate: '2026-10-01',
    listingDate: '2026-10-06',
    priceRange: { min: 371, max: 390 },
    lotSize: 38,
    minInvestment: 14820, // 38 * 390
    issueSize: 11327,
    freshIssue: 4499,
    ofs: 6828,
    gmp: {
      value: 36,
      percentage: 9.23,
      expectedListingPrice: 426,
      trend: 'STABLE',
      updatedAt: '15 mins ago'
    },
    subscription: {
      overall: 3.25,
      qib: 5.12,
      nii: 2.85,
      retail: 1.94,
      employee: 2.10
    },
    aiRating: {
      verdict: 'APPLY FOR LONG TERM',
      score: 83,
      tag: 'Duopoly Quick-Commerce Play',
      summary: 'Duopoly player alongside Zomato in India food delivery and Instamart dark-store quick commerce. Improving contribution margins and rapid dark store expansion offer high operating leverage.',
      strengths: [
        'India food delivery duopoly with dominant 45% metro market share.',
        'Instamart GOV growing at 104% YoY with shortening delivery SLAs.',
        'High cross-selling between Dineout, Food Delivery, and Instamart users.'
      ],
      risks: [
        'Intense quick commerce turf war with Blinkit and Zepto requiring high burn.',
        'Consolidated business remains net loss making at PAT level.'
      ],
      financials: {
        revenue3YCAGR: '36.2%',
        ebitdaMargin: '-12.4%',
        patMargin: '-18.1%',
        peRatio: 'Negative (Turnaround)',
        industryPE: 74.5,
        debtToEquity: '0.18',
        ronw: '-14.2%'
      },
      peers: [
        { name: 'Zomato Ltd', pe: 115.2, pb: 12.8 },
        { name: 'DoorDash (US)', pe: 68.0, pb: 8.4 }
      ]
    }
  },
  {
    id: 'IPO_AFCONS_INFRA',
    name: 'Afcons Infrastructure Ltd',
    symbol: 'AFCONS',
    category: 'MAINBOARD',
    status: 'OPEN',
    badge: 'SHAPOORJI PALLONJI GROUP',
    sector: 'Heavy Infrastructure & Marine EPC',
    exchange: 'BSE, NSE',
    openDate: '2026-09-25',
    closeDate: '2026-09-28',
    allotmentDate: '2026-09-29',
    listingDate: '2026-10-04',
    priceRange: { min: 440, max: 463 },
    lotSize: 32,
    minInvestment: 14816, // 32 * 463
    issueSize: 5430,
    freshIssue: 1250,
    ofs: 4180,
    gmp: {
      value: 68,
      percentage: 14.69,
      expectedListingPrice: 531,
      trend: 'EXPANDING',
      updatedAt: '25 mins ago'
    },
    subscription: {
      overall: 6.42,
      qib: 9.80,
      nii: 7.20,
      retail: 3.45,
      employee: 3.10
    },
    aiRating: {
      verdict: 'APPLY FOR LISTING GAINS',
      score: 86,
      tag: 'Order Book ₹34,000+ Cr',
      summary: 'Flagship EPC entity of the SP Group with global execution track record in underground metros, elevated highways, and deepwater marine ports. Healthy order book to sales ratio of 2.6x.',
      strengths: [
        'Robust order book of ₹34,100 Cr providing 3-year revenue visibility.',
        'Superior ROCE of 19.4% compared to Tier-1 infrastructure peers.',
        'High technical complexity projects giving strong bidding moats.'
      ],
      risks: [
        'Significant OFS component directed to promoter group debt resolution.',
        'Project delay risks and raw material escalation in overseas contracts.'
      ],
      financials: {
        revenue3YCAGR: '18.4%',
        ebitdaMargin: '11.8%',
        patMargin: '4.6%',
        peRatio: 31.2,
        industryPE: 37.8,
        debtToEquity: '0.85',
        ronw: '16.2%'
      },
      peers: [
        { name: 'Larsen & Toubro', pe: 36.2, pb: 5.1 },
        { name: 'KEC International', pe: 41.5, pb: 4.8 },
        { name: 'Kalpataru Projects', pe: 28.4, pb: 3.2 }
      ]
    }
  },
  {
    id: 'IPO_ZEN_ROBOTICS_SME',
    name: 'Zenith Robotics & AI Automation Ltd',
    symbol: 'ZENITHROBO',
    category: 'SME',
    status: 'OPEN',
    badge: 'NSE EMERGE SME',
    sector: 'Defense & Industrial Automation',
    exchange: 'NSE Emerge',
    openDate: '2026-09-27',
    closeDate: '2026-09-30',
    allotmentDate: '2026-10-01',
    listingDate: '2026-10-05',
    priceRange: { min: 145, max: 152 },
    lotSize: 1000,
    minInvestment: 152000, // SME Lot Size 1000 * 152
    issueSize: 48.6,
    freshIssue: 48.6,
    ofs: 0,
    gmp: {
      value: 82,
      percentage: 53.95,
      expectedListingPrice: 234,
      trend: 'EXPANDING',
      updatedAt: '5 mins ago'
    },
    subscription: {
      overall: 48.6,
      qib: 32.4,
      nii: 68.2,
      retail: 54.1,
      employee: 0
    },
    aiRating: {
      verdict: 'HIGH RISK SME • HIGH RETURN',
      score: 79,
      tag: '54% GMP • High Liquidity Risk',
      summary: 'High GMP SME player specializing in robotic automated warehouse arms and surveillance drones for defense. Massive retail oversubscription, but requires caution due to SME illiquidity post-listing.',
      strengths: [
        '54% Grey market premium indicating massive listing surge potential.',
        'Proprietary defense patent licenses in tethered drone systems.',
        'High EBITDA margins exceeding 26% on specialized hardware.'
      ],
      risks: [
        'High minimum capital ticket of ₹1.52L required for 1 SME lot.',
        'Small revenue base (₹64 Cr) with high client concentration in 3 PSU clients.'
      ],
      financials: {
        revenue3YCAGR: '62.4%',
        ebitdaMargin: '26.8%',
        patMargin: '14.2%',
        peRatio: 26.5,
        industryPE: 48.0,
        debtToEquity: '0.22',
        ronw: '28.4%'
      },
      peers: [
        { name: 'IdeaForge Technology', pe: 58.2, pb: 6.2 },
        { name: 'Zen Technologies', pe: 72.1, pb: 14.5 }
      ]
    }
  },

  // ================= UPCOMING IPOS =================
  {
    id: 'IPO_HYUNDAI_MOTOR',
    name: 'Hyundai Motor India Ltd',
    symbol: 'HYUNDAI',
    category: 'MAINBOARD',
    status: 'UPCOMING',
    badge: 'HISTORIC ₹27,870 CR MEGA ISSUE',
    sector: 'Automobile & EV Passenger Vehicles',
    exchange: 'BSE, NSE',
    openDate: '2026-10-15',
    closeDate: '2026-10-17',
    allotmentDate: '2026-10-18',
    listingDate: '2026-10-22',
    priceRange: { min: 1865, max: 1960 },
    lotSize: 7,
    minInvestment: 13720, // 7 * 1960
    issueSize: 27870,
    freshIssue: 0,
    ofs: 27870,
    gmp: {
      value: 175,
      percentage: 8.93,
      expectedListingPrice: 2135,
      trend: 'STABLE',
      updatedAt: '1 hour ago'
    },
    subscription: {
      overall: 0,
      qib: 0,
      nii: 0,
      retail: 0,
      employee: 0
    },
    aiRating: {
      verdict: 'STRONG APPLY',
      score: 94,
      tag: 'India #2 Passenger Car Giant',
      summary: 'Second largest car manufacturer in India after Maruti Suzuki. Premium SUV segment leader with Creta, Venue, and Ioniq EV line. Exceptional cash generation and 40%+ RoNW profile.',
      strengths: [
        'India 2nd largest passenger vehicle OEM with 14.6% national market share.',
        'Dominant leadership in high-margin Compact SUV & Mid SUV space.',
        'Talegaon plant acquisition will expand annual capacity to 1 million units.'
      ],
      risks: [
        '100% OFS issue by South Korean parent company with no capital infusion into Indian ops.',
        'Royalty payment structure to parent firm (approx 3.5% of revenue).'
      ],
      financials: {
        revenue3YCAGR: '21.5%',
        ebitdaMargin: '13.1%',
        patMargin: '8.7%',
        peRatio: 26.2,
        industryPE: 29.8,
        debtToEquity: '0.04',
        ronw: '42.8%'
      },
      peers: [
        { name: 'Maruti Suzuki India', pe: 28.5, pb: 4.8 },
        { name: 'Tata Motors', pe: 10.4, pb: 3.2 },
        { name: 'Mahindra & Mahindra', pe: 31.6, pb: 5.6 }
      ]
    }
  },
  {
    id: 'IPO_NIVA_BUPA',
    name: 'Niva Bupa Health Insurance Ltd',
    symbol: 'NIVABUPA',
    category: 'MAINBOARD',
    status: 'UPCOMING',
    badge: 'STANDALONE HEALTH INSURER',
    sector: 'Health Insurance & InsurTech',
    exchange: 'BSE, NSE',
    openDate: '2026-10-08',
    closeDate: '2026-10-11',
    allotmentDate: '2026-10-12',
    listingDate: '2026-10-16',
    priceRange: { min: 70, max: 74 },
    lotSize: 200,
    minInvestment: 14800,
    issueSize: 2200,
    freshIssue: 800,
    ofs: 1400,
    gmp: {
      value: 12,
      percentage: 16.22,
      expectedListingPrice: 86,
      trend: 'EXPANDING',
      updatedAt: '2 hours ago'
    },
    subscription: {
      overall: 0,
      qib: 0,
      nii: 0,
      retail: 0,
      employee: 0
    },
    aiRating: {
      verdict: 'APPLY FOR LISTING GAINS',
      score: 81,
      tag: 'Pure-Play Health Underwriter',
      summary: '3rd largest standalone health insurer in India backed by Bupa and True North. Beneficiary of rising healthcare awareness and digital agency distribution.',
      strengths: [
        '33.4% Gross Direct Premium Income CAGR over the last 3 fiscal years.',
        'High combined ratio improvement indicating disciplined underwriting.',
        'Comprehensive hospital cashless network spanning 10,000+ healthcare centers.'
      ],
      risks: [
        'Elevated claims ratio risk during seasonal disease outbreaks.',
        'High customer acquisition marketing costs in digital channels.'
      ],
      financials: {
        revenue3YCAGR: '33.4%',
        ebitdaMargin: '8.4%',
        patMargin: '2.8%',
        peRatio: 52.4,
        industryPE: 58.1,
        debtToEquity: '0.00',
        ronw: '9.4%'
      },
      peers: [
        { name: 'Star Health Insurance', pe: 46.2, pb: 4.1 },
        { name: 'ICICI Lombard General', pe: 42.8, pb: 7.2 }
      ]
    }
  },
  {
    id: 'IPO_MOBIKWIK',
    name: 'One MobiKwik Systems Ltd',
    symbol: 'MOBIKWIK',
    category: 'MAINBOARD',
    status: 'UPCOMING',
    badge: 'FINTECH TURNAROUND',
    sector: 'Digital Payments & BNPL Credit',
    exchange: 'BSE, NSE',
    openDate: '2026-10-21',
    closeDate: '2026-10-24',
    allotmentDate: '2026-10-25',
    listingDate: '2026-10-29',
    priceRange: { min: 260, max: 279 },
    lotSize: 53,
    minInvestment: 14787,
    issueSize: 700,
    freshIssue: 700,
    ofs: 0,
    gmp: {
      value: 28,
      percentage: 10.04,
      expectedListingPrice: 307,
      trend: 'STABLE',
      updatedAt: '3 hours ago'
    },
    subscription: {
      overall: 0,
      qib: 0,
      nii: 0,
      retail: 0,
      employee: 0
    },
    aiRating: {
      verdict: 'NEUTRAL / CAUTIOUS',
      score: 68,
      tag: 'Fintech Valuation Re-rating',
      summary: 'Digital wallet and credit distribution platform that recently reported full-year profitability. Valuation looks sensitive compared to listed payment peers.',
      strengths: [
        '100% fresh issue of ₹700 Cr to expand payment gateway and AI financial products.',
        'Turned PAT positive at ₹14.1 Cr in FY24 from deep historical losses.',
        'High merchant ecosystem with 4 million+ registered point-of-sale touchpoints.'
      ],
      risks: [
        'Regulatory headwinds on digital lending and NBFC co-branding partnerships.',
        'Fierce competition from PhonePe, Google Pay, and Paytm.'
      ],
      financials: {
        revenue3YCAGR: '42.1%',
        ebitdaMargin: '3.8%',
        patMargin: '1.6%',
        peRatio: 124.5,
        industryPE: 65.0,
        debtToEquity: '0.12',
        ronw: '4.8%'
      },
      peers: [
        { name: 'One97 Communications (Paytm)', pe: -38.0, pb: 2.4 },
        { name: 'PB Fintech (PolicyBazaar)', pe: 94.2, pb: 8.1 }
      ]
    }
  },

  // ================= RECENTLY LISTED IPOS =================
  {
    id: 'IPO_BAJAJ_HOUSING',
    name: 'Bajaj Housing Finance Ltd',
    symbol: 'BAJAJHFL',
    category: 'MAINBOARD',
    status: 'LISTED',
    badge: '+114.3% LISTING GAIN',
    sector: 'Housing Finance & Mortgage NBFC',
    exchange: 'BSE, NSE',
    openDate: '2026-09-09',
    closeDate: '2026-09-11',
    allotmentDate: '2026-09-12',
    listingDate: '2026-09-16',
    priceRange: { min: 66, max: 70 },
    lotSize: 214,
    minInvestment: 14980,
    issueSize: 6560,
    freshIssue: 3560,
    ofs: 3000,
    issuePrice: 70,
    listingPrice: 150,
    currentPrice: 168.40,
    listingGainPct: 114.28,
    totalGainPct: 140.57,
    subscription: {
      overall: 67.43,
      qib: 222.05,
      nii: 43.97,
      retail: 7.41,
      employee: 2.15
    },
    aiRating: {
      verdict: 'STRONG HOLD / VALUE LEADER',
      score: 96,
      tag: 'Grade A+ Bajaj Pedigree',
      summary: 'Historic listing doubling investor wealth on day 1. Best-in-class asset quality with lowest Gross NPA in Indian mortgage space at 0.28%.',
      strengths: [
        'Part of the Bajaj Group with highest AAA credit rating from CRISIL & CARE.',
        'Lowest Gross NPA (0.28%) across the entire Indian housing finance spectrum.',
        'AUM growing consistently at 32% CAGR.'
      ],
      risks: [
        'Rich valuation trading at 4.2x Price to Book.',
        'Margin pressure as cost of wholesale borrowing remains elevated.'
      ],
      financials: {
        revenue3YCAGR: '38.2%',
        ebitdaMargin: '68.4%',
        patMargin: '23.1%',
        peRatio: 48.5,
        industryPE: 24.2,
        debtToEquity: '5.20',
        ronw: '15.2%'
      },
      peers: [
        { name: 'LIC Housing Finance', pe: 7.8, pb: 1.1 },
        { name: 'PND Housing Finance', pe: 12.4, pb: 1.6 },
        { name: 'Aavas Financiers', pe: 26.8, pb: 3.2 }
      ]
    }
  },
  {
    id: 'IPO_PREMIER_ENERGIES',
    name: 'Premier Energies Ltd',
    symbol: 'PREMIERENE',
    category: 'MAINBOARD',
    status: 'LISTED',
    badge: '+120.0% LISTING GAIN',
    sector: 'Solar Cell & Module Manufacturing',
    exchange: 'BSE, NSE',
    openDate: '2026-08-27',
    closeDate: '2026-08-29',
    allotmentDate: '2026-08-30',
    listingDate: '2026-09-03',
    priceRange: { min: 427, max: 450 },
    lotSize: 33,
    minInvestment: 14850,
    issueSize: 2830,
    freshIssue: 1291,
    ofs: 1539,
    issuePrice: 450,
    listingPrice: 990,
    currentPrice: 1124.50,
    listingGainPct: 120.00,
    totalGainPct: 149.88,
    subscription: {
      overall: 75.24,
      qib: 216.70,
      nii: 50.98,
      retail: 7.64,
      employee: 11.20
    },
    aiRating: {
      verdict: 'PARTIAL PROFIT BOOKING',
      score: 88,
      tag: 'Solar Cell Technology Pioneer',
      summary: 'Second largest integrated solar cell and module maker in India with TopCon technology facility. Monumental listing gain of 120%.',
      strengths: [
        'India 2nd largest domestic manufacturer of solar cells.',
        'Strong order book of ₹5,600 Cr with major Tier 1 power developers.',
        'Direct beneficiary of government ALMM protectionist import duties.'
      ],
      risks: [
        'Sharp expansion in valuation multiples post listing.',
        'Global polysilicon price dump by Chinese players could squeeze margins.'
      ],
      financials: {
        revenue3YCAGR: '118.0%',
        ebitdaMargin: '23.4%',
        patMargin: '12.8%',
        peRatio: 56.4,
        industryPE: 42.0,
        debtToEquity: '0.68',
        ronw: '31.2%'
      },
      peers: [
        { name: 'Waaree Energies', pe: 48.2, pb: 8.4 },
        { name: 'Websol Energy', pe: 64.0, pb: 11.2 }
      ]
    }
  },
  {
    id: 'IPO_KRN_HEAT',
    name: 'KRN Heat Exchanger Ltd',
    symbol: 'KRNHEAT',
    category: 'MAINBOARD',
    status: 'LISTED',
    badge: '+118.2% LISTING GAIN',
    sector: 'HVAC & Refrigeration Components',
    exchange: 'BSE, NSE',
    openDate: '2026-09-25',
    closeDate: '2026-09-27',
    allotmentDate: '2026-09-28',
    listingDate: '2026-10-01',
    priceRange: { min: 209, max: 220 },
    lotSize: 65,
    minInvestment: 14300,
    issueSize: 341.9,
    freshIssue: 341.9,
    ofs: 0,
    issuePrice: 220,
    listingPrice: 480,
    currentPrice: 512.00,
    listingGainPct: 118.18,
    totalGainPct: 132.72,
    subscription: {
      overall: 214.42,
      qib: 253.90,
      nii: 431.63,
      retail: 96.50,
      employee: 0
    },
    aiRating: {
      verdict: 'STRONG APPLY SUCCESS',
      score: 93,
      tag: '214x Mega Oversubscription',
      summary: 'Export-oriented copper heat exchanger specialist for global HVAC OEMs (Daikin, Blue Star, Voltas). Huge bumper listing.',
      strengths: [
        '100% fresh issue dedicated to new Neemrana mega facility.',
        'High export revenue share (over 34%) to Europe and North America.',
        'Zero long term debt and 35%+ RoNW.'
      ],
      risks: [
        'Copper and aluminum raw material cost volatility.',
        'Client concentration with top 5 customers accounting for 65% sales.'
      ],
      financials: {
        revenue3YCAGR: '44.8%',
        ebitdaMargin: '18.6%',
        patMargin: '12.4%',
        peRatio: 38.0,
        industryPE: 45.0,
        debtToEquity: '0.14',
        ronw: '34.8%'
      },
      peers: [
        { name: 'Amber Enterprises', pe: 82.4, pb: 6.8 },
        { name: 'Subros Ltd', pe: 36.2, pb: 4.1 }
      ]
    }
  }
];

/**
 * Filter and query IPOs
 */
function getIPOList({ status = 'ALL', category = 'ALL', search = '' } = {}) {
  let list = [...IPO_DATASET];

  if (status && status !== 'ALL') {
    list = list.filter(item => item.status === status.toUpperCase());
  }

  if (category && category !== 'ALL') {
    list = list.filter(item => item.category === category.toUpperCase());
  }

  if (search && search.trim() !== '') {
    const q = search.toLowerCase().trim();
    list = list.filter(item => 
      item.name.toLowerCase().includes(q) || 
      item.symbol.toLowerCase().includes(q) || 
      item.sector.toLowerCase().includes(q)
    );
  }

  // Calculate high-level intelligence stats
  const activeCount = IPO_DATASET.filter(i => i.status === 'OPEN').length;
  const upcomingCount = IPO_DATASET.filter(i => i.status === 'UPCOMING').length;
  const listedCount = IPO_DATASET.filter(i => i.status === 'LISTED').length;

  const openIposWithGmp = IPO_DATASET.filter(i => i.status === 'OPEN' && i.gmp);
  const highestGmp = openIposWithGmp.reduce((max, cur) => cur.gmp.percentage > max ? cur.gmp.percentage : max, 0);

  const listedIpos = IPO_DATASET.filter(i => i.status === 'LISTED');
  const avgListingGain = listedIpos.length > 0 
    ? (listedIpos.reduce((sum, cur) => sum + cur.listingGainPct, 0) / listedIpos.length).toFixed(1)
    : '0.0';

  const totalVirtualBlocked = userPaperBids.reduce((sum, b) => sum + (b.totalBlocked || 0), 0);

  return {
    ipos: list,
    stats: {
      activeCount,
      upcomingCount,
      listedCount,
      highestGmpPct: `+${highestGmp}%`,
      avgListingGainPct: `+${avgListingGain}%`,
      totalVirtualBlocked,
      activeBidsCount: userPaperBids.length
    }
  };
}

/**
 * Get detailed analysis for a specific IPO
 */
function getIPODetails(ipoId) {
  const ipo = IPO_DATASET.find(item => item.id === ipoId);
  if (!ipo) return null;
  return ipo;
}

/**
 * Submit Paper Bid / Virtual IPO Application
 */
function submitPaperBid({ ipoId, lots = 1, category = 'RETAIL', upiId = 'trader@okhdfcbank' }) {
  const ipo = IPO_DATASET.find(item => item.id === ipoId);
  if (!ipo) {
    throw new Error('IPO not found');
  }

  if (ipo.status !== 'OPEN') {
    throw new Error(`Cannot bid on this IPO: current status is ${ipo.status}`);
  }

  const numLots = Math.max(1, parseInt(lots) || 1);
  const totalShares = numLots * ipo.lotSize;
  const totalBlocked = totalShares * (ipo.priceRange?.max || 100);

  // Calculate realistic retail allotment odds based on retail subscription
  const retailSub = ipo.subscription?.retail || 1;
  let oddsText = 'Guaranteed Allotment (Under-subscribed)';
  let oddsPct = 100;
  if (retailSub > 1) {
    oddsPct = Math.max(1, Math.min(99, Math.round((1 / retailSub) * 100)));
    oddsText = `1 in ${Math.round(retailSub)} (~${oddsPct}%)`;
  }

  const newBid = {
    id: `BID_${Date.now().toString().slice(-4)}`,
    ipoId: ipo.id,
    companyName: ipo.name,
    symbol: ipo.symbol,
    appliedDate: new Date().toISOString().split('T')[0],
    category: category.toUpperCase(),
    lots: numLots,
    shares: totalShares,
    bidPrice: ipo.priceRange.max,
    totalBlocked,
    upiId: upiId || 'trader@okhdfcbank',
    allotmentStatus: 'PENDING', // PENDING, ALLOTTED, NOT_ALLOTTED
    listingStatus: 'UPCOMING',
    allottedShares: 0,
    listingPrice: null,
    listingGainPct: null,
    realizedPL: 0,
    pnlRealized: false,
    allotmentOdds: oddsText,
    allotmentOddsPct: oddsPct
  };

  userPaperBids.unshift(newBid);

  return {
    success: true,
    message: `Virtual UPI Mandate of ₹${totalBlocked.toLocaleString()} blocked successfully for ${ipo.name} (${numLots} lot${numLots > 1 ? 's' : ''}).`,
    bid: newBid
  };
}

/**
 * Get all active and past paper bids
 */
function getUserBids() {
  return userPaperBids;
}

/**
 * Simulate Listing Day result for a bid
 */
function simulateListingDay(bidId) {
  const bid = userPaperBids.find(b => b.id === bidId);
  if (!bid) {
    throw new Error('Bid record not found');
  }

  if (bid.pnlRealized) {
    return {
      success: true,
      message: 'This application has already completed listing day settlement.',
      bid
    };
  }

  const ipo = IPO_DATASET.find(item => item.id === bid.ipoId);
  if (!ipo) {
    throw new Error('Linked IPO not found');
  }

  // Simulate allotment draw based on retail odds
  const retailSub = ipo.subscription?.retail || 1;
  const allotted = Math.random() <= (1 / Math.max(1, retailSub));

  if (!allotted) {
    bid.allotmentStatus = 'NOT_ALLOTTED';
    bid.listingStatus = 'UNBLOCK';
    bid.allottedShares = 0;
    bid.realizedPL = 0;
    bid.pnlRealized = true;
    return {
      success: true,
      message: `Allotment result: Not Allotted (Retail oversubscribed ${retailSub}x). Full funds of ₹${bid.totalBlocked.toLocaleString()} unblocked.`,
      bid
    };
  }

  // Allotted! Calculate listing day gain based on GMP + micro volatility
  bid.allotmentStatus = 'ALLOTTED';
  bid.listingStatus = 'LISTED';
  bid.allottedShares = ipo.lotSize; // 1 lot allotted in retail draw

  const gmpVal = ipo.gmp ? ipo.gmp.value : (ipo.priceRange.max * 0.15);
  // Add a slight realistic randomness (+/- 5%) to simulated listing price
  const simulatedListingPrice = Math.round(ipo.priceRange.max + gmpVal * (0.95 + Math.random() * 0.1));
  const gainPerShare = simulatedListingPrice - ipo.priceRange.max;
  const realizedPL = gainPerShare * bid.allottedShares;
  const listingGainPct = Number(((gainPerShare / ipo.priceRange.max) * 100).toFixed(2));

  bid.listingPrice = simulatedListingPrice;
  bid.listingGainPct = listingGainPct;
  bid.realizedPL = realizedPL;
  bid.pnlRealized = true;

  return {
    success: true,
    message: `🎉 Bumper Allotment! Allotted 1 Lot (${bid.allottedShares} shares). Listed at ₹${simulatedListingPrice} (+${listingGainPct}%). Realized P&L: +₹${realizedPL.toLocaleString()}!`,
    bid
  };
}

module.exports = {
  getIPOList,
  getIPODetails,
  submitPaperBid,
  getUserBids,
  simulateListingDay
};
