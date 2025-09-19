const {
  skillOptions,
  interestOptions,
  availabilityOptions,
  locationOptions,
} = require('./referenceData.constants');

function toSlug(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sanitizeText(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function createMatcher(options) {
  const byValue = new Map();
  const byLabel = new Map();
  options.forEach((option) => {
    byValue.set(option.value.toLowerCase(), option);
    byLabel.set(option.label.toLowerCase(), option);
  });
  return function match(candidate) {
    if (!candidate) return null;
    const key = candidate.toLowerCase();
    return byValue.get(key) || byLabel.get(key) || null;
  };
}

const matchSkill = createMatcher(skillOptions);
const matchInterest = createMatcher(interestOptions);
const matchAvailability = createMatcher(availabilityOptions);
const matchLocation = createMatcher(locationOptions);

function normalizeMultiChoice(values, matchFn) {
  if (!values && values !== 0) {
    return [];
  }
  const input = Array.isArray(values)
    ? values
    : String(values)
        .split(',')
        .map((segment) => segment.trim())
        .filter(Boolean);

  const seen = new Set();
  const result = [];

  input.forEach((raw) => {
    if (raw === null || raw === undefined) {
      return;
    }
    const trimmed = String(raw).trim();
    if (!trimmed) return;
    const matched = matchFn(trimmed.toLowerCase());
    const value = matched ? matched.value : toSlug(trimmed);
    if (!value || seen.has(value)) {
      return;
    }
    seen.add(value);
    result.push(value);
  });

  return result;
}

function normalizeSkills(values) {
  return normalizeMultiChoice(values, matchSkill);
}

function normalizeInterests(values) {
  return normalizeMultiChoice(values, matchInterest);
}

function normalizeAvailability(value) {
  const text = sanitizeText(value);
  if (!text) {
    return '';
  }
  const match = matchAvailability(text.toLowerCase());
  if (!match) {
    throw Object.assign(new Error('Select a supported availability option'), { statusCode: 400 });
  }
  return match.value;
}

function normalizeLocation(value, { required = false } = {}) {
  const text = sanitizeText(value);
  if (!text) {
    if (required) {
      throw Object.assign(new Error('Location is required'), { statusCode: 400 });
    }
    return '';
  }
  const lower = text.toLowerCase();
  const slug = toSlug(text);
  const match = matchLocation(lower) || (slug ? matchLocation(slug) : null);
  if (match) {
    return match.label;
  }
  if (slug && slug === lower) {
    return titleCaseFromSlug(slug);
  }
  return text;
}

function titleCaseFromSlug(slug) {
  if (!slug) return '';
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getAvailabilityLabel(value) {
  if (!value) return '';
  const match = matchAvailability(String(value).toLowerCase());
  if (match) {
    return match.label;
  }
  return titleCaseFromSlug(value);
}

function getLocationLabel(value) {
  const text = sanitizeText(value);
  if (!text) return '';
  const lower = text.toLowerCase();
  const slug = toSlug(text);
  const match = matchLocation(lower) || (slug ? matchLocation(slug) : null);
  if (match) {
    return match.label;
  }
  if (slug && slug === lower) {
    return titleCaseFromSlug(slug);
  }
  return text;
}

function buildLocationSearchTerms(value) {
  const terms = new Set();
  const text = sanitizeText(value);
  const slug = toSlug(text);
  if (text) {
    const lower = text.toLowerCase();
    terms.add(lower);
    const spaced = lower.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (spaced) {
      terms.add(spaced);
    }
  }
  const lower = text ? text.toLowerCase() : '';
  const match = matchLocation(lower) || (slug ? matchLocation(slug) : null);
  if (match) {
    terms.add(match.label.toLowerCase());
    terms.add(match.value.toLowerCase());
  } else {
    if (slug) {
      terms.add(slug.toLowerCase());
    }
  }
  return Array.from(terms).filter(Boolean);
}

function getReferenceData() {
  return {
    skills: skillOptions,
    interests: interestOptions,
    availability: availabilityOptions,
    locations: locationOptions,
  };
}

module.exports = {
  getReferenceData,
  normalizeSkills,
  normalizeInterests,
  normalizeAvailability,
  normalizeLocation,
  getAvailabilityLabel,
  getLocationLabel,
  buildLocationSearchTerms,
  toSlug,
};
