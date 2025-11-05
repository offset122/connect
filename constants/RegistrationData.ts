
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
  'Homosexual',
  'Bisexual',
  'Pansexual',
  'Asexual',
  'Other',
];

export const RELATIONSHIP_GOALS = [
  'Casual',
  'Serious relationship leading to marriage',
  'Marriage',
  'Long-term relationship',
  'Short-term relationship',
  'Friendship',
  'Not sure yet',
];

export const RELIGIONS = [
  'Christianity',
  'Islam',
  'Hinduism',
  'Buddhism',
  'Judaism',
  'Traditional African religion',
  'Atheist / Agnostic',
  'Other',
  'Prefer not to say',
];

export const RELIGIOUSNESS_LEVELS = [
  'Very religious',
  'Moderately religious',
  'Slightly religious',
  'Not religious',
];

export const YES_NO_OPTIONS = ['Yes', 'No'];

export const COMPLEXIONS = [
  'Very fair',
  'Fair',
  'Medium',
  'Olive',
  'Brown',
  'Dark brown',
  'Very dark',
  'Medium brown (warm cocoa or bronze tone)',
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
  'Employed full-time',
  'Employed part-time',
  'Self-employed',
  'Unemployed',
  'Student',
  'Retired',
];

export const FINANCIAL_STABILITY_OPTIONS = [
  'Very stable',
  'Stable',
  'Getting by',
  'Struggling',
];

export const YES_NO_MAYBE = ['Yes', 'No', 'Maybe'];

export const MARITAL_STATUS_OPTIONS = [
  'Single',
  'Divorced',
  'Widowed',
  'Widower',
  'Married',
  'Separated',
];

export const RELATIONSHIP_PERSPECTIVES = [
  'Traditional (man leads)',
  'Modern (woman leads)',
  'Shared roles / equal partnership',
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
