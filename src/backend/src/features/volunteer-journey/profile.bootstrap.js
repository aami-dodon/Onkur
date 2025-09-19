const logger = require('../../utils/logger');
const {
  ensureSkillOption,
  ensureInterestOption,
  ensureAvailabilityOption,
  ensureState,
  ensureCity,
} = require('./volunteerJourney.repository');

const SKILL_SEEDS = [
  { value: 'tree planting', label: 'Tree Planting' },
  { value: 'beach cleanup coordination', label: 'Beach Cleanup Coordination' },
  { value: 'first aid support', label: 'First Aid Support' },
  { value: 'community outreach', label: 'Community Outreach' },
  { value: 'teaching and mentoring', label: 'Teaching and Mentoring' },
  { value: 'graphic design', label: 'Graphic Design' },
  { value: 'social media storytelling', label: 'Social Media Storytelling' },
  { value: 'waste segregation', label: 'Waste Segregation' },
  { value: 'fundraising', label: 'Fundraising' },
  { value: 'photography and videography', label: 'Photography and Videography' },
];

const INTEREST_SEEDS = [
  { value: 'urban forestry', label: 'Urban Forestry' },
  { value: 'coastal conservation', label: 'Coastal Conservation' },
  { value: 'animal welfare', label: 'Animal Welfare' },
  { value: 'education access', label: 'Education Access' },
  { value: 'rural development', label: 'Rural Development' },
  { value: 'climate advocacy', label: 'Climate Advocacy' },
  { value: 'women empowerment', label: "Women Empowerment" },
  { value: 'youth leadership', label: 'Youth Leadership' },
  { value: 'health camps', label: 'Health Camps' },
  { value: 'disaster relief', label: 'Disaster Relief' },
];

const AVAILABILITY_SEEDS = [
  { value: 'weekday_mornings', label: 'Weekday mornings', sortOrder: 10 },
  { value: 'weekday_afternoons', label: 'Weekday afternoons', sortOrder: 20 },
  { value: 'weekday_evenings', label: 'Weekday evenings', sortOrder: 30 },
  { value: 'weekends', label: 'Weekends', sortOrder: 40 },
  { value: 'flexible', label: 'Flexible / On-call', sortOrder: 50 },
];

const STATE_SEEDS = [
  { code: 'DL', name: 'Delhi' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'TG', name: 'Telangana' },
  { code: 'WB', name: 'West Bengal' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'KL', name: 'Kerala' },
  { code: 'HR', name: 'Haryana' },
  { code: 'PB', name: 'Punjab' },
];

const CITY_SEEDS = [
  { stateCode: 'DL', name: 'New Delhi' },
  { stateCode: 'MH', name: 'Mumbai' },
  { stateCode: 'MH', name: 'Pune' },
  { stateCode: 'MH', name: 'Nagpur' },
  { stateCode: 'MH', name: 'Nashik' },
  { stateCode: 'KA', name: 'Bengaluru' },
  { stateCode: 'KA', name: 'Mysuru' },
  { stateCode: 'KA', name: 'Mangaluru' },
  { stateCode: 'KA', name: 'Hubballi-Dharwad' },
  { stateCode: 'TN', name: 'Chennai' },
  { stateCode: 'TN', name: 'Coimbatore' },
  { stateCode: 'TN', name: 'Madurai' },
  { stateCode: 'TN', name: 'Tiruchirappalli' },
  { stateCode: 'TG', name: 'Hyderabad' },
  { stateCode: 'TG', name: 'Warangal' },
  { stateCode: 'TG', name: 'Nizamabad' },
  { stateCode: 'WB', name: 'Kolkata' },
  { stateCode: 'WB', name: 'Howrah' },
  { stateCode: 'WB', name: 'Durgapur' },
  { stateCode: 'WB', name: 'Siliguri' },
  { stateCode: 'GJ', name: 'Ahmedabad' },
  { stateCode: 'GJ', name: 'Surat' },
  { stateCode: 'GJ', name: 'Vadodara' },
  { stateCode: 'GJ', name: 'Rajkot' },
  { stateCode: 'UP', name: 'Lucknow' },
  { stateCode: 'UP', name: 'Kanpur' },
  { stateCode: 'UP', name: 'Varanasi' },
  { stateCode: 'UP', name: 'Noida' },
  { stateCode: 'RJ', name: 'Jaipur' },
  { stateCode: 'RJ', name: 'Udaipur' },
  { stateCode: 'RJ', name: 'Jodhpur' },
  { stateCode: 'RJ', name: 'Kota' },
  { stateCode: 'KL', name: 'Thiruvananthapuram' },
  { stateCode: 'KL', name: 'Kochi' },
  { stateCode: 'KL', name: 'Kozhikode' },
  { stateCode: 'KL', name: 'Thrissur' },
  { stateCode: 'HR', name: 'Gurugram' },
  { stateCode: 'HR', name: 'Faridabad' },
  { stateCode: 'HR', name: 'Karnal' },
  { stateCode: 'HR', name: 'Hisar' },
  { stateCode: 'PB', name: 'Chandigarh' },
  { stateCode: 'PB', name: 'Ludhiana' },
  { stateCode: 'PB', name: 'Amritsar' },
  { stateCode: 'PB', name: 'Jalandhar' },
];

function makeCitySlug(stateCode, name) {
  const normalizedName = String(name)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${String(stateCode).toLowerCase()}-${normalizedName}`;
}

async function seedVolunteerProfileLookups() {
  try {
    await Promise.all(SKILL_SEEDS.map((seed) => ensureSkillOption(seed)));
    await Promise.all(INTEREST_SEEDS.map((seed) => ensureInterestOption(seed)));
    await Promise.all(AVAILABILITY_SEEDS.map((seed) => ensureAvailabilityOption(seed)));

    for (const state of STATE_SEEDS) {
      await ensureState(state);
    }

    for (const city of CITY_SEEDS) {
      await ensureCity({
        slug: makeCitySlug(city.stateCode, city.name),
        stateCode: city.stateCode,
        name: city.name,
      });
    }

    logger.info('Volunteer profile lookup seeds applied', {
      skills: SKILL_SEEDS.length,
      interests: INTEREST_SEEDS.length,
      availability: AVAILABILITY_SEEDS.length,
      states: STATE_SEEDS.length,
      cities: CITY_SEEDS.length,
    });
  } catch (error) {
    logger.error('Failed to seed volunteer profile lookups', { error: error.message });
    throw error;
  }
}

module.exports = {
  seedVolunteerProfileLookups,
  makeCitySlug,
};
