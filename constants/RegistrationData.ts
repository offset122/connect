
// Data constants for registration form dropdowns

export const KENYAN_TRIBES = [
  'Bajuni',
  'Borana',
  'Chonyi',
  'Dahalo',
  'Dasanach',
  'Digo',
  'Duruma',
  'El Molo',
  'Embu',
  'Gabbra',
  'Gabra',
  'Giriama',
  'Ilchamus',
  'Kalenjin',
  'Kamba',
  'Kauma',
  'Kenyan Arabs',
  'Kikuyu',
  'Kisii',
  'Kuria',
  'Luo',
  'Luhya',
  'Maasai',
  'Marakwet',
  'Mbeere',
  'Meru',
  'Mijikenda',
  'Nandi',
  'Orma',
  'Pokomo',
  'Pokot',
  'Rabai',
  'Rendille',
  'Ribe',
  'Sabaot',
  'Samburu',
  'Somali',
  'Suba',
  'Swahili',
  'Taveta',
  'Teso',
  'Tharaka',
  'Tugen',
  'Turkana',
  'Others',
];

export const KENYAN_COUNTIES = [
  'Baringo',
  'Bomet',
  'Bungoma',
  'Busia',
  'Elgeyo-Marakwet',
  'Embu',
  'Garissa',
  'Homa Bay',
  'Isiolo',
  'Kajiado',
  'Kakamega',
  'Kericho',
  'Kiambu',
  'Kilifi',
  'Kirinyaga',
  'Kisii',
  'Kisumu',
  'Kitui',
  'Kwale',
  'Laikipia',
  'Lamu',
  'Machakos',
  'Makueni',
  'Mandera',
  'Marsabit',
  'Meru',
  'Migori',
  'Mombasa',
  'Murang\'a',
  'Nairobi',
  'Nakuru',
  'Nandi',
  'Narok',
  'Nyamira',
  'Nyandarua',
  'Nyeri',
  'Samburu',
  'Siaya',
  'Taita-Taveta',
  'Tana River',
  'Tharaka-Nithi',
  'Trans Nzoia',
  'Turkana',
  'Uasin Gishu',
  'Vihiga',
  'Wajir',
  'West Pokot',
];

// Simplified constituencies - in production, this would be filtered by county
export const CONSTITUENCIES: { [key: string]: string[] } = {
  'Nairobi': [
    'Westlands',
    'Dagoretti North',
    'Dagoretti South',
    'Langata',
    'Kibra',
    'Roysambu',
    'Kasarani',
    'Ruaraka',
    'Embakasi South',
    'Embakasi North',
    'Embakasi Central',
    'Embakasi East',
    'Embakasi West',
    'Makadara',
    'Kamukunji',
    'Starehe',
    'Mathare',
  ],
  'Mombasa': [
    'Changamwe',
    'Jomvu',
    'Kisauni',
    'Nyali',
    'Likoni',
    'Mvita',
  ],
  'Kisumu': [
    'Kisumu East',
    'Kisumu West',
    'Kisumu Central',
    'Seme',
    'Nyando',
    'Muhoroni',
    'Nyakach',
  ],
  // Add more counties and their constituencies as needed
  'Default': ['Select county first'],
};

export const COUNTRIES = [
  'Kenya',
  'Uganda',
  'Tanzania',
  'Rwanda',
  'Burundi',
  'South Sudan',
  'Ethiopia',
  'Somalia',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'South Africa',
  'Nigeria',
  'Ghana',
  'Other',
];

export const NATIONALITIES = [
  'Kenyan',
  'Ugandan',
  'Tanzanian',
  'Rwandan',
  'Burundian',
  'South Sudanese',
  'Ethiopian',
  'Somali',
  'American',
  'British',
  'Canadian',
  'Australian',
  'South African',
  'Nigerian',
  'Ghanaian',
  'Other',
];

export const GENDERS = ['Male', 'Female'];

export const SEXUAL_ORIENTATIONS = [
  'Heterosexual',
  'Lesbian',
  'Bisexual',
  'Gay',
  'Pansexual',
];

export const RELATIONSHIP_GOALS = [
  'Casual',
  'Serious relationship leading to marriage',
];

export const RELIGIONS = [
  'Christianity',
  'Islam',
  'Hinduism',
  'Buddhism',
  'Bahá\'í Faith',
  'Traditional African religions',
  'Atheism',
];

export const RELIGIOUSNESS_LEVELS = [
  'Religious',
  'Very religious',
  'Not religious',
];

export const YES_NO_OPTIONS = ['Yes', 'No'];

export const COMPLEXIONS = [
  'Dark (deep ebony or rich chocolate tone)',
  'Medium brown (warm cocoa or bronze tone)',
  'Light brown (golden or caramel tone)',
  'Fair (light or pale complexion)',
];

export const TEETH_STATUS_OPTIONS = [
  'White and well aligned',
  'Stained',
  'Chipped or cracked',
  'Missing teeth',
  'Crooked or misaligned',
];

export const HIV_STATUS_OPTIONS = ['Negative', 'Positive'];

export const BLOOD_GROUPS = [
  'A+',
  'A−',
  'B+',
  'B−',
  'AB+',
  'AB−',
  'O+',
  'O−',
  'I don\'t know',
];

export const YES_NO_OCCASIONALLY = ['Yes', 'No', 'Occasionally'];

export const EDUCATION_LEVELS = [
  'Primary education',
  'Secondary education',
  'Diploma or certificate',
  'Bachelor\'s degree',
  'Master\'s degree',
  'Doctorate (PhD)',
  'Other',
];

export const EMPLOYMENT_STATUS_OPTIONS = [
  'Self employed',
  'Employed',
  'Unemployed',
  'Student',
  'Retired',
  'Other',
];

export const FINANCIAL_STABILITY_OPTIONS = [
  'Fully financially stable',
  'I can afford my bills comfortably',
  'Managing but sometimes struggle',
  'Entrepreneur trying to build my business',
  'Financially unstable / in need of support',
];

export const YES_NO_MAYBE = ['Yes', 'No', 'Maybe'];

export const MARITAL_STATUS_OPTIONS = [
  'Single',
  'Divorced',
  'Widowed',
  'Widower',
];

export const RELATIONSHIP_PERSPECTIVES = [
  'Man leads, woman follows',
  'Woman leads, man follows',
  'Shared roles / equal partnership',
  'Traditional roles (each has defined responsibilities)',
  'Independent but together (each maintains personal space and goals)',
  'Still figuring it out',
];

// Body type images would be stored in assets and referenced here
export const MALE_BODY_TYPES = [
  { id: 'slim', label: 'Slim', image: 'male_slim' },
  { id: 'athletic', label: 'Athletic', image: 'male_athletic' },
  { id: 'average', label: 'Average', image: 'male_average' },
  { id: 'muscular', label: 'Muscular', image: 'male_muscular' },
  { id: 'heavyset', label: 'Heavyset', image: 'male_heavyset' },
];

export const FEMALE_BODY_TYPES = [
  { id: 'slim', label: 'Slim', image: 'female_slim' },
  { id: 'athletic', label: 'Athletic', image: 'female_athletic' },
  { id: 'average', label: 'Average', image: 'female_average' },
  { id: 'curvy', label: 'Curvy', image: 'female_curvy' },
  { id: 'plus_size', label: 'Plus Size', image: 'female_plus_size' },
];
