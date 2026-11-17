/**
 * Comprehensive Indian States, Union Territories & Cities Repository
 * Used for auto-populating Operational Cities, Hubs, and Regional Ops in LocalDen.
 */

export const INDIA_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi / NCR',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
]

export const INDIA_CITIES_BY_STATE = {
  'Andhra Pradesh': [
    'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati',
    'Kurnool', 'Kakinada', 'Rajahmundry', 'Kadapa', 'Anantapur',
    'Eluru', 'Vizianagaram', 'Ongole', 'Chittoor', 'Machilipatnam',
  ],
  'Arunachal Pradesh': [
    'Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro', 'Tezu',
  ],
  'Assam': [
    'Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon',
    'Tinsukia', 'Tezpur', 'Bongaigaon', 'Karimganj', 'Sivasagar',
  ],
  'Bihar': [
    'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia',
    'Darbhanga', 'Bihar Sharif', 'Arrah', 'Begusarai', 'Katihar',
    'Munger', 'Chhapra', 'Samastipur', 'Motihari',
  ],
  'Chandigarh': [
    'Chandigarh', 'Mohali (SAS Nagar)', 'Panchkula',
  ],
  'Chhattisgarh': [
    'Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Rajnandgaon',
    'Jagdalpur', 'Raigarh', 'Ambikapur', 'Durg',
  ],
  'Delhi / NCR': [
    'Delhi (Central & North)', 'South Delhi', 'East Delhi', 'West Delhi',
    'Dwarka & West NCR', 'Rohini & North NCR', 'Noida', 'Greater Noida',
    'Gurugram', 'Faridabad', 'Ghaziabad',
  ],
  'Goa': [
    'Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda',
    'Candolim & Calangute', 'Anjuna & Vagator', 'Porvorim',
  ],
  'Gujarat': [
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar',
    'Jamnagar', 'Gandhinagar', 'Junagadh', 'Anand', 'Navsari',
    'Morbi', 'Nadiad', 'Surendranagar', 'Bharuch', 'Vapi', 'Mehsana',
  ],
  'Haryana': [
    'Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Karnal',
    'Rohtak', 'Hisar', 'Sonipat', 'Panchkula', 'Yamunanagar',
    'Bahadurgarh', 'Rewari', 'Palwal',
  ],
  'Himachal Pradesh': [
    'Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Kullu',
    'Manali', 'Baddi', 'Bilaspur', 'Hamirpur', 'Una',
  ],
  'Jammu and Kashmir': [
    'Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur',
    'Kathua', 'Sopore',
  ],
  'Jharkhand': [
    'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro Steel City',
    'Deoghar', 'Hazaribagh', 'Giridih', 'Ramgarh',
  ],
  'Karnataka': [
    'Bengaluru', 'Mysuru (Mysore)', 'Hubballi-Dharwad', 'Mangaluru (Mangalore)',
    'Belagavi (Belgaum)', 'Davanagere', 'Ballari (Bellary)', 'Shivamogga (Shimoga)',
    'Tumakuru (Tumkur)', 'Udupi & Manipal', 'Kalaburagi (Gulbarga)', 'Bidar',
    'Hassan', 'Chikkamagaluru', 'Mandya',
  ],
  'Kerala': [
    'Kochi (Cochin)', 'Thiruvananthapuram (Trivandrum)', 'Kozhikode (Calicut)',
    'Thrissur', 'Kollam', 'Palakkad', 'Alappuzha (Alleppey)', 'Kannur',
    'Kottayam', 'Malappuram', 'Kasaragod',
  ],
  'Madhya Pradesh': [
    'Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain',
    'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa', 'Singrauli',
  ],
  'Maharashtra': [
    'Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik',
    'Kalyan-Dombivli', 'Vasai-Virar', 'Navi Mumbai', 'Chhatrapati Sambhajinagar (Aurangabad)',
    'Solapur', 'Kolhapur', 'Amravati', 'Nanded', 'Sangli', 'Jalgaon',
    'Akola', 'Latur', 'Dhule', 'Ahmednagar', 'Chandrapur',
  ],
  'Manipur': [
    'Imphal', 'Churachandpur', 'Thoubal', 'Bishnupur',
  ],
  'Meghalaya': [
    'Shillong', 'Tura', 'Jowai', 'Nongpoh',
  ],
  'Mizoram': [
    'Aizawl', 'Lunglei', 'Champhai', 'Serchhip',
  ],
  'Nagaland': [
    'Kohima', 'Dimapur', 'Mokokchung', 'Tuensang',
  ],
  'Odisha': [
    'Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur',
    'Puri', 'Balasore', 'Bhadrak', 'Baripada', 'Jharsuguda',
  ],
  'Puducherry': [
    'Puducherry', 'Karaikal', 'Ozhukarai',
  ],
  'Punjab': [
    'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda',
    'Mohali', 'Hoshiarpur', 'Batala', 'Pathankot', 'Moga', 'Abohar',
  ],
  'Rajasthan': [
    'Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer',
    'Udaipur', 'Bhilwara', 'Alwar', 'Sikar', 'Bharatpur',
    'Pali', 'Sri Ganganagar', 'Beawar',
  ],
  'Sikkim': [
    'Gangtok', 'Namchi', 'Geyzing', 'Mangan',
  ],
  'Tamil Nadu': [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli (Trichy)',
    'Salem', 'Tiruppur', 'Erode', 'Vellore', 'Thoothukudi (Tuticorin)',
    'Tirunelveli', 'Dindigul', 'Thanjavur', 'Ranipet', 'Hosur', 'Nagercoil',
  ],
  'Telangana': [
    'Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Ramagundam',
    'Khammam', 'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Siddipet',
  ],
  'Tripura': [
    'Agartala', 'Dharmanagar', 'Udaipur', 'Kailashahar',
  ],
  'Uttar Pradesh': [
    'Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Meerut',
    'Varanasi', 'Prayagraj (Allahabad)', 'Bareilly', 'Aligarh',
    'Moradabad', 'Noida', 'Greater Noida', 'Saharanpur', 'Gorakhpur',
    'Firozabad', 'Jhansi', 'Muzaffarnagar', 'Mathura', 'Ayodhya',
  ],
  'Uttarakhand': [
    'Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur',
    'Rishikesh', 'Kashipur', 'Nainital', 'Mussoorie',
  ],
  'West Bengal': [
    'Kolkata', 'Howrah', 'Asansol', 'Siliguri', 'Durgapur',
    'Bardhaman', 'Malda', 'Baharampur', 'Habra', 'Kharagpur',
    'Shantipur', 'Dankuni', 'Bally',
  ],
}

/**
 * Rich preset templates for major cities with real verified high-demand rental localities
 */
export const CITY_PRESETS = {
  Mumbai: {
    name: 'Mumbai',
    displayName: 'Mumbai (MMR & Suburbs)',
    shortName: 'Mumbai',
    state: 'Maharashtra',
    popularLocalities: [
      'Bandra West', 'Andheri West', 'Andheri East', 'Juhu', 'Powai',
      'Lower Parel', 'BKC (Bandra Kurla Complex)', 'Worli', 'Dadar',
      'Malad West', 'Goregaon', 'Kandivali', 'Borivali', 'Navi Mumbai', 'Thane West',
    ],
  },
  Bengaluru: {
    name: 'Bengaluru',
    displayName: 'Bengaluru (Bangalore)',
    shortName: 'Bengaluru',
    state: 'Karnataka',
    popularLocalities: [
      'Koramangala', 'Indiranagar', 'HSR Layout', 'Whitefield', 'BTM Layout',
      'Jayanagar', 'JP Nagar', 'Bellandur', 'Marathahalli', 'Electronic City',
      'Sadashivanagar', 'Malleshwaram', 'Hebbal', 'Sarjapur Road', 'MG Road',
    ],
  },
  Gurugram: {
    name: 'Gurugram',
    displayName: 'Gurugram (Gurgaon)',
    shortName: 'Gurugram',
    state: 'Haryana',
    popularLocalities: [
      'DLF Cyber City', 'DLF Phase 1', 'DLF Phase 2', 'DLF Phase 3', 'DLF Phase 4',
      'DLF Phase 5', 'Golf Course Road', 'Golf Course Ext Road', 'Sector 29',
      'Sector 56', 'Sector 57', 'Sohna Road', 'MG Road', 'Sushant Lok', 'Nirvana Country',
    ],
  },
  'Delhi (Central & North)': {
    name: 'Delhi',
    displayName: 'Delhi NCR (Capital Region)',
    shortName: 'Delhi',
    state: 'Delhi / NCR',
    popularLocalities: [
      'Connaught Place', 'South Extension', 'Hauz Khas', 'Saket', 'Vasant Kunj',
      'Greater Kailash', 'Lajpat Nagar', 'Karol Bagh', 'Dwarka', 'Rohini',
      'Chanakyapuri', 'Defence Colony', 'Janakpuri', 'Pitampura',
    ],
  },
  Hyderabad: {
    name: 'Hyderabad',
    displayName: 'Hyderabad (Cyberabad & Twin Cities)',
    shortName: 'Hyderabad',
    state: 'Telangana',
    popularLocalities: [
      'HITEC City', 'Gachibowli', 'Madhapur', 'Jubilee Hills', 'Banjara Hills',
      'Kondapur', 'Kukatpally', 'Begumpet', 'Secunderabad', 'Financial District',
      'Ameerpet', 'Manikonda', 'Kothaguda',
    ],
  },
  Pune: {
    name: 'Pune',
    displayName: 'Pune (Metro & PCMC)',
    shortName: 'Pune',
    state: 'Maharashtra',
    popularLocalities: [
      'Koregaon Park', 'Kalyani Nagar', 'Viman Nagar', 'Baner', 'Aundh',
      'Hinjawadi', 'Wakad', 'Kothrud', 'Magarpatta City', 'Kharadi',
      'Shivajinagar', 'Hadapsar', 'Bavdhan', 'Pimple Saudagar',
    ],
  },
  Chennai: {
    name: 'Chennai',
    displayName: 'Chennai (Madras)',
    shortName: 'Chennai',
    state: 'Tamil Nadu',
    popularLocalities: [
      'T Nagar', 'Adyar', 'Besant Nagar', 'Mylapore', 'Anna Nagar',
      'Velachery', 'OMR (Old Mahabalipuram Rd)', 'Nungambakkam', 'Thiruvanmiyur',
      'Alwarpet', 'ECR', 'Guindy', 'Kilpauk',
    ],
  },
  Kolkata: {
    name: 'Kolkata',
    displayName: 'Kolkata (Calcutta)',
    shortName: 'Kolkata',
    state: 'West Bengal',
    popularLocalities: [
      'Park Street', 'Salt Lake (Bidhannagar)', 'New Town', 'Ballygunge',
      'Alipore', 'Gariahat', 'Dum Dum', 'Rajarhat', 'Jadavpur', 'Howrah',
      'Behala', 'Sector V',
    ],
  },
  Ahmedabad: {
    name: 'Ahmedabad',
    displayName: 'Ahmedabad & Gandhinagar',
    shortName: 'Ahmedabad',
    state: 'Gujarat',
    popularLocalities: [
      'SG Highway', 'Prahlad Nagar', 'Bodakdev', 'Satellite', 'Vastrapur',
      'Navrangpura', 'Maninagar', 'Bopal', 'Sindhu Bhavan Road', 'Gandhinagar Gift City',
    ],
  },
  Jaipur: {
    name: 'Jaipur',
    displayName: 'Jaipur (Pink City)',
    shortName: 'Jaipur',
    state: 'Rajasthan',
    popularLocalities: [
      'Malviya Nagar', 'Vaishali Nagar', 'C-Scheme', 'Mansarovar',
      'Raja Park', 'Tonk Road', 'Jagatpura', 'Bani Park', 'Civil Lines',
    ],
  },
  Chandigarh: {
    name: 'Chandigarh',
    displayName: 'Chandigarh (Tricity)',
    shortName: 'Chandigarh',
    state: 'Chandigarh',
    popularLocalities: [
      'Sector 17', 'Sector 35', 'Sector 8', 'Sector 9', 'Sector 22',
      'Mohali Phase 7', 'Mohali Phase 3B2', 'Panchkula Sector 20', 'IT Park',
    ],
  },
  Lucknow: {
    name: 'Lucknow',
    displayName: 'Lucknow (Awadh Region)',
    shortName: 'Lucknow',
    state: 'Uttar Pradesh',
    popularLocalities: [
      'Gomti Nagar', 'Hazratganj', 'Aliganj', 'Indira Nagar', 'Mahanagar',
      'Gomti Nagar Extension', 'Ashiyana', 'Vibhuti Khand',
    ],
  },
  Noida: {
    name: 'Noida',
    displayName: 'Noida & Greater Noida (NCR)',
    shortName: 'Noida',
    state: 'Uttar Pradesh',
    popularLocalities: [
      'Sector 18', 'Sector 62', 'Sector 50', 'Sector 137', 'Sector 76',
      'Sector 128', 'Greater Noida West', 'Pari Chowk', 'Expressway',
    ],
  },
  Kochi: {
    name: 'Kochi',
    displayName: 'Kochi (Cochin & Ernakulam)',
    shortName: 'Kochi',
    state: 'Kerala',
    popularLocalities: [
      'Kakkanad (InfoPark)', 'Panampilly Nagar', 'Marine Drive', 'Kaloor',
      'Edappally', 'Fort Kochi', 'Vyttila', 'Aluva',
    ],
  },
  Indore: {
    name: 'Indore',
    displayName: 'Indore (Malwa Hub)',
    shortName: 'Indore',
    state: 'Madhya Pradesh',
    popularLocalities: [
      'Vijay Nagar', 'Palasia', 'AB Road', 'Bhawarkua', 'Super Corridor',
      'Saket Nagar', 'Annapurna',
    ],
  },
  Goa: {
    name: 'Goa',
    displayName: 'Goa (North & South Coast)',
    shortName: 'Goa',
    state: 'Goa',
    popularLocalities: [
      'Panaji', 'Candolim', 'Calangute', 'Anjuna', 'Vagator', 'Assagao',
      'Porvorim', 'Margao', 'Colva', 'Benaulim',
    ],
  },
  Dehradun: {
    name: 'Dehradun',
    displayName: 'Dehradun & Rishikesh Valley',
    shortName: 'Dehradun',
    state: 'Uttarakhand',
    popularLocalities: [
      'Rajpur Road', 'Jakhan', 'Dalanwala', 'Vasant Vihar', 'Clock Tower',
      'Sahastradhara Road', 'Rishikesh Tapovan',
    ],
  },
}

/**
 * Searches across all Indian cities and states by substring query.
 */
export function searchIndiaLocations(query = '') {
  if (!query || typeof query !== 'string') return []
  const q = query.trim().toLowerCase()
  if (!q) return []

  const results = []

  // Check presets first (rich info)
  Object.values(CITY_PRESETS).forEach((p) => {
    if (
      p.name.toLowerCase().includes(q) ||
      p.state.toLowerCase().includes(q) ||
      p.displayName.toLowerCase().includes(q)
    ) {
      results.push({
        name: p.name,
        state: p.state,
        displayName: p.displayName,
        popularLocalities: p.popularLocalities,
        isPreset: true,
      })
    }
  })

  const presetNames = new Set(results.map((r) => `${r.name.toLowerCase()}-${r.state.toLowerCase()}`))

  // Search across INDIA_CITIES_BY_STATE
  Object.entries(INDIA_CITIES_BY_STATE).forEach(([state, cities]) => {
    cities.forEach((city) => {
      const key = `${city.toLowerCase()}-${state.toLowerCase()}`
      if (presetNames.has(key)) return

      if (city.toLowerCase().includes(q) || state.toLowerCase().includes(q)) {
        results.push({
          name: city,
          state: state,
          displayName: `${city}, ${state}`,
          popularLocalities: [`${city} Central`, `${city} North`, `${city} South`],
          isPreset: false,
        })
      }
    })
  })

  return results.slice(0, 20)
}

/**
 * Returns preset or default metadata for a given city name.
 */
export function getPresetForCity(cityName = '', stateName = '') {
  if (!cityName) return null

  // Direct match in presets
  for (const [key, preset] of Object.entries(CITY_PRESETS)) {
    if (key.toLowerCase() === cityName.toLowerCase() || preset.name.toLowerCase() === cityName.toLowerCase()) {
      return preset
    }
  }

  // Generate sensible defaults
  return {
    name: cityName,
    displayName: stateName ? `${cityName}, ${stateName}` : cityName,
    shortName: cityName,
    state: stateName || 'India',
    popularLocalities: [
      `${cityName} Central`,
      `${cityName} East`,
      `${cityName} West`,
      `${cityName} North`,
      `${cityName} South`,
    ],
  }
}
