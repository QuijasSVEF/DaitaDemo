interface MathTopic {
  label: string;
  subtopics: string[];
}

export const MATH_TOPICS: Record<string, MathTopic> = {
  numbers: {
    label: 'Numbers and Operations',
    subtopics: [
      'Place Value',
      'Addition and Subtraction',
      'Multiplication and Division',
      'Fractions',
      'Decimals',
      'Percentages',
      'Ratios and Proportions',
      'Integer Operations',
      'Exponents and Square Roots'
    ]
  },
  algebra: {
    label: 'Algebra',
    subtopics: [
      'Variables and Expressions',
      'Equations and Inequalities',
      'Linear Functions',
      'Quadratic Functions',
      'Systems of Equations',
      'Polynomials',
      'Factoring',
      'Rational Expressions',
      'Radicals'
    ]
  },
  geometry: {
    label: 'Geometry',
    subtopics: [
      'Basic Shapes',
      'Angles',
      'Triangles',
      'Quadrilaterals',
      'Circles',
      'Area and Perimeter',
      'Volume and Surface Area',
      'Transformations',
      'Coordinate Geometry',
      'Similarity and Congruence'
    ]
  },
  measurement: {
    label: 'Measurement',
    subtopics: [
      'Length',
      'Area',
      'Volume',
      'Weight/Mass',
      'Time',
      'Temperature',
      'Metric System',
      'Imperial System',
      'Unit Conversions'
    ]
  },
  statistics: {
    label: 'Statistics and Probability',
    subtopics: [
      'Data Collection',
      'Data Representation',
      'Mean, Median, Mode',
      'Range and Variance',
      'Probability Basics',
      'Compound Events',
      'Permutations and Combinations',
      'Statistical Inference',
      'Data Analysis'
    ]
  },
  functions: {
    label: 'Functions and Relations',
    subtopics: [
      'Function Notation',
      'Domain and Range',
      'Linear Functions',
      'Quadratic Functions',
      'Exponential Functions',
      'Logarithmic Functions',
      'Trigonometric Functions',
      'Function Operations',
      'Function Transformations'
    ]
  }
};