/**
 * Built-in dependency maps for common geographic and semantic column pairs.
 *
 * Structure: each map is a plain object where keys are parent-column values
 * and values are arrays of valid child-column values.
 *
 * @module dependency-maps
 */

/** @type {Record<string, string[]>} */
export const COUNTRY_STATE_MAP = {
  'United States': ['California', 'Texas', 'Florida', 'New York', 'Illinois', 'Ohio', 'Georgia', 'North Carolina', 'Michigan', 'Washington'],
  'Canada': ['Ontario', 'Quebec', 'British Columbia', 'Alberta', 'Manitoba', 'Saskatchewan', 'Nova Scotia', 'New Brunswick'],
  'Australia': ['New South Wales', 'Victoria', 'Queensland', 'Western Australia', 'South Australia', 'Tasmania'],
  'Germany': ['Bavaria', 'North Rhine-Westphalia', 'Baden-Württemberg', 'Hesse', 'Lower Saxony', 'Saxony', 'Berlin', 'Hamburg'],
  'United Kingdom': ['England', 'Scotland', 'Wales', 'Northern Ireland'],
  'France': ['Île-de-France', 'Auvergne-Rhône-Alpes', 'Hauts-de-France', 'Provence-Alpes-Côte d\'Azur', 'Occitanie', 'Bretagne'],
  'Brazil': ['São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Bahia', 'Paraná', 'Rio Grande do Sul', 'Pernambuco', 'Ceará'],
  'India': ['Uttar Pradesh', 'Maharashtra', 'Tamil Nadu', 'Karnataka', 'Rajasthan', 'Gujarat', 'West Bengal', 'Delhi'],
  'China': ['Guangdong', 'Shandong', 'Henan', 'Sichuan', 'Jiangsu', 'Hebei', 'Hunan', 'Zhejiang'],
  'Japan': ['Tokyo', 'Osaka', 'Kanagawa', 'Aichi', 'Saitama', 'Chiba', 'Hyogo', 'Fukuoka'],
};

/** @type {Record<string, string[]>} */
export const COUNTRY_CITY_MAP = {
  'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'],
  'Canada': ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City'],
  'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Canberra', 'Hobart'],
  'Germany': ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Leipzig'],
  'United Kingdom': ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Leeds', 'Liverpool', 'Bristol', 'Edinburgh'],
  'France': ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Bordeaux'],
  'Brazil': ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba'],
  'India': ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad'],
  'China': ['Shanghai', 'Beijing', 'Guangzhou', 'Shenzhen', 'Tianjin', 'Wuhan', 'Chengdu', 'Nanjing'],
  'Japan': ['Tokyo', 'Osaka', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Kyoto', 'Kawasaki'],
};

/** @type {Record<string, string>} */
export const COUNTRY_ZIPCODE_PATTERN_MAP = {
  'United States': '#####',
  'Canada': 'A#A #A#',
  'Australia': '####',
  'Germany': '#####',
  'United Kingdom': 'AA## #AA',
  'France': '#####',
  'Brazil': '#####-###',
  'India': '######',
  'China': '######',
  'Japan': '###-####',
};

/**
 * Map of dependency pair keys to their lookup maps.
 *
 * Keys are formatted as `"parentType→childType"`.
 *
 * @type {Record<string, Record<string, string[]>>}
 */
export const BUILT_IN_DEPENDENCY_MAPS = {
  'country→state': COUNTRY_STATE_MAP,
  'country→city': COUNTRY_CITY_MAP,
};
