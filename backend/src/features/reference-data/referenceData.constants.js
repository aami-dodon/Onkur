const skillOptions = [
  { value: 'first-aid-cpr', label: 'First aid & CPR' },
  { value: 'event-coordination', label: 'Event coordination' },
  { value: 'community-outreach', label: 'Community outreach' },
  { value: 'environmental-education', label: 'Environmental education' },
  { value: 'native-planting', label: 'Native planting' },
  { value: 'trail-maintenance', label: 'Trail maintenance' },
  { value: 'youth-engagement', label: 'Youth engagement' },
  { value: 'fundraising', label: 'Fundraising & partnerships' },
  { value: 'storytelling', label: 'Storytelling & social media' },
];

const interestOptions = [
  { value: 'urban-greening', label: 'Urban greening' },
  { value: 'pollinator-habitats', label: 'Pollinator habitats' },
  { value: 'climate-advocacy', label: 'Climate advocacy' },
  { value: 'youth-mentorship', label: 'Youth mentorship' },
  { value: 'food-security', label: 'Food security' },
  { value: 'coastal-cleanups', label: 'Coastal cleanups' },
  { value: 'forest-restoration', label: 'Forest restoration' },
  { value: 'community-gardens', label: 'Community gardens' },
];

const availabilityOptions = [
  { value: 'weekday-mornings', label: 'Weekday mornings' },
  { value: 'weekday-afternoons', label: 'Weekday afternoons' },
  { value: 'weekday-evenings', label: 'Weekday evenings' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'flexible-remote', label: 'Flexible or remote' },
];

const locationOptions = [
  { value: 'toronto-on', label: 'Toronto, ON' },
  { value: 'ottawa-on', label: 'Ottawa, ON' },
  { value: 'vancouver-bc', label: 'Vancouver, BC' },
  { value: 'calgary-ab', label: 'Calgary, AB' },
  { value: 'montreal-qc', label: 'Montréal, QC' },
  { value: 'winnipeg-mb', label: 'Winnipeg, MB' },
  { value: 'halifax-ns', label: 'Halifax, NS' },
  { value: 'edmonton-ab', label: 'Edmonton, AB' },
  { value: 'saskatoon-sk', label: 'Saskatoon, SK' },
];

module.exports = {
  skillOptions,
  interestOptions,
  availabilityOptions,
  locationOptions,
};
