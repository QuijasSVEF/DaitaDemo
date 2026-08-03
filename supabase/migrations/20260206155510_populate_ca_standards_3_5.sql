/*
  # Populate California Math Standards - Grades 3 through 5

  ## Purpose
  Continues populating comprehensive California Common Core Math Standards.
  
  ## Changes
  - Adds all missing Grade 3, 4, and 5 standards
  - Covers OA, NBT, NF, MD, G domains for each grade
  
  ## Tables Modified
  - `ca_standards` - INSERT only
*/

-- Grade 3 - Operations and Algebraic Thinking
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '3', 'Operations and Algebraic Thinking', 'Represent and solve problems involving multiplication and division', '3.OA.1', 'Interpret products of whole numbers.'),
  ('Mathematics', '3', 'Operations and Algebraic Thinking', 'Represent and solve problems involving multiplication and division', '3.OA.2', 'Interpret whole-number quotients of whole numbers.'),
  ('Mathematics', '3', 'Operations and Algebraic Thinking', 'Represent and solve problems involving multiplication and division', '3.OA.3', 'Use multiplication and division within 100 to solve word problems in situations involving equal groups, arrays, and measurement quantities.'),
  ('Mathematics', '3', 'Operations and Algebraic Thinking', 'Represent and solve problems involving multiplication and division', '3.OA.4', 'Determine the unknown whole number in a multiplication or division equation relating three whole numbers.'),
  ('Mathematics', '3', 'Operations and Algebraic Thinking', 'Understand properties of multiplication and the relationship between multiplication and division', '3.OA.5', 'Apply properties of operations as strategies to multiply and divide.'),
  ('Mathematics', '3', 'Operations and Algebraic Thinking', 'Understand properties of multiplication and the relationship between multiplication and division', '3.OA.6', 'Understand division as an unknown-factor problem.'),
  ('Mathematics', '3', 'Operations and Algebraic Thinking', 'Multiply and divide within 100', '3.OA.7', 'Fluently multiply and divide within 100, using strategies such as the relationship between multiplication and division.'),
  ('Mathematics', '3', 'Operations and Algebraic Thinking', 'Solve problems involving the four operations, and identify and explain patterns in arithmetic', '3.OA.8', 'Solve two-step word problems using the four operations.'),
  ('Mathematics', '3', 'Operations and Algebraic Thinking', 'Solve problems involving the four operations, and identify and explain patterns in arithmetic', '3.OA.9', 'Identify arithmetic patterns (including patterns in the addition table or multiplication table), and explain them using properties of operations.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 3 - Number and Operations in Base Ten
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '3', 'Number and Operations in Base Ten', 'Use place value understanding and properties of operations to perform multi-digit arithmetic', '3.NBT.1', 'Use place value understanding to round whole numbers to the nearest 10 or 100.'),
  ('Mathematics', '3', 'Number and Operations in Base Ten', 'Use place value understanding and properties of operations to perform multi-digit arithmetic', '3.NBT.2', 'Fluently add and subtract within 1000 using strategies and algorithms based on place value.'),
  ('Mathematics', '3', 'Number and Operations in Base Ten', 'Use place value understanding and properties of operations to perform multi-digit arithmetic', '3.NBT.3', 'Multiply one-digit whole numbers by multiples of 10 in the range 10-90.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 3 - Number and Operations - Fractions
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '3', 'Number and Operations—Fractions', 'Develop understanding of fractions as numbers', '3.NF.1', 'Understand a fraction 1/b as the quantity formed by 1 part when a whole is partitioned into b equal parts.'),
  ('Mathematics', '3', 'Number and Operations—Fractions', 'Develop understanding of fractions as numbers', '3.NF.2', 'Understand a fraction as a number on the number line; represent fractions on a number line diagram.'),
  ('Mathematics', '3', 'Number and Operations—Fractions', 'Develop understanding of fractions as numbers', '3.NF.2a', 'Represent a fraction 1/b on a number line diagram by defining the interval from 0 to 1 as the whole and partitioning it into b equal parts.'),
  ('Mathematics', '3', 'Number and Operations—Fractions', 'Develop understanding of fractions as numbers', '3.NF.2b', 'Represent a fraction a/b on a number line diagram by marking off a lengths 1/b from 0.'),
  ('Mathematics', '3', 'Number and Operations—Fractions', 'Develop understanding of fractions as numbers', '3.NF.3', 'Explain equivalence of fractions in special cases, and compare fractions by reasoning about their size.'),
  ('Mathematics', '3', 'Number and Operations—Fractions', 'Develop understanding of fractions as numbers', '3.NF.3a', 'Understand two fractions as equivalent if they are the same size, or the same point on a number line.'),
  ('Mathematics', '3', 'Number and Operations—Fractions', 'Develop understanding of fractions as numbers', '3.NF.3b', 'Recognize and generate simple equivalent fractions. Explain why the fractions are equivalent.'),
  ('Mathematics', '3', 'Number and Operations—Fractions', 'Develop understanding of fractions as numbers', '3.NF.3c', 'Express whole numbers as fractions, and recognize fractions that are equivalent to whole numbers.'),
  ('Mathematics', '3', 'Number and Operations—Fractions', 'Develop understanding of fractions as numbers', '3.NF.3d', 'Compare two fractions with the same numerator or the same denominator by reasoning about their size.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 3 - Measurement and Data
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '3', 'Measurement and Data', 'Solve problems involving measurement and estimation', '3.MD.1', 'Tell and write time to the nearest minute and measure time intervals in minutes. Solve word problems involving addition and subtraction of time intervals in minutes.'),
  ('Mathematics', '3', 'Measurement and Data', 'Solve problems involving measurement and estimation', '3.MD.2', 'Measure and estimate liquid volumes and masses of objects using standard units of grams, kilograms, and liters.'),
  ('Mathematics', '3', 'Measurement and Data', 'Represent and interpret data', '3.MD.3', 'Draw a scaled picture graph and a scaled bar graph to represent a data set with several categories.'),
  ('Mathematics', '3', 'Measurement and Data', 'Represent and interpret data', '3.MD.4', 'Generate measurement data by measuring lengths using rulers marked with halves and fourths of an inch.'),
  ('Mathematics', '3', 'Measurement and Data', 'Geometric measurement: understand concepts of area and relate area to multiplication and to addition', '3.MD.5', 'Recognize area as an attribute of plane figures and understand concepts of area measurement.'),
  ('Mathematics', '3', 'Measurement and Data', 'Geometric measurement: understand concepts of area and relate area to multiplication and to addition', '3.MD.5a', 'A square with side length 1 unit, called a "unit square," is said to have "one square unit" of area.'),
  ('Mathematics', '3', 'Measurement and Data', 'Geometric measurement: understand concepts of area and relate area to multiplication and to addition', '3.MD.5b', 'A plane figure which can be covered without gaps or overlaps by n unit squares is said to have an area of n square units.'),
  ('Mathematics', '3', 'Measurement and Data', 'Geometric measurement: understand concepts of area and relate area to multiplication and to addition', '3.MD.6', 'Measure areas by counting unit squares.'),
  ('Mathematics', '3', 'Measurement and Data', 'Geometric measurement: understand concepts of area and relate area to multiplication and to addition', '3.MD.7', 'Relate area to the operations of multiplication and addition.'),
  ('Mathematics', '3', 'Measurement and Data', 'Geometric measurement: recognize perimeter', '3.MD.8', 'Solve real world and mathematical problems involving perimeters of polygons.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 3 - Geometry
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '3', 'Geometry', 'Reason with shapes and their attributes', '3.G.1', 'Understand that shapes in different categories may share attributes, and that the shared attributes can define a larger category.'),
  ('Mathematics', '3', 'Geometry', 'Reason with shapes and their attributes', '3.G.2', 'Partition shapes into parts with equal areas. Express the area of each part as a unit fraction of the whole.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 4 - Operations and Algebraic Thinking
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '4', 'Operations and Algebraic Thinking', 'Use the four operations with whole numbers to solve problems', '4.OA.1', 'Interpret a multiplication equation as a comparison.'),
  ('Mathematics', '4', 'Operations and Algebraic Thinking', 'Use the four operations with whole numbers to solve problems', '4.OA.2', 'Multiply or divide to solve word problems involving multiplicative comparison.'),
  ('Mathematics', '4', 'Operations and Algebraic Thinking', 'Use the four operations with whole numbers to solve problems', '4.OA.3', 'Solve multistep word problems posed with whole numbers and having whole-number answers using the four operations.'),
  ('Mathematics', '4', 'Operations and Algebraic Thinking', 'Gain familiarity with factors and multiples', '4.OA.4', 'Find all factor pairs for a whole number in the range 1-100.'),
  ('Mathematics', '4', 'Operations and Algebraic Thinking', 'Generate and analyze patterns', '4.OA.5', 'Generate a number or shape pattern that follows a given rule. Identify apparent features of the pattern that were not explicit in the rule itself.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 4 - Number and Operations in Base Ten
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '4', 'Number and Operations in Base Ten', 'Generalize place value understanding for multi-digit whole numbers', '4.NBT.1', 'Recognize that in a multi-digit whole number, a digit in one place represents ten times what it represents in the place to its right.'),
  ('Mathematics', '4', 'Number and Operations in Base Ten', 'Generalize place value understanding for multi-digit whole numbers', '4.NBT.2', 'Read and write multi-digit whole numbers using base-ten numerals, number names, and expanded form. Compare two multi-digit numbers based on meanings of the digits in each place.'),
  ('Mathematics', '4', 'Number and Operations in Base Ten', 'Generalize place value understanding for multi-digit whole numbers', '4.NBT.3', 'Use place value understanding to round multi-digit whole numbers to any place.'),
  ('Mathematics', '4', 'Number and Operations in Base Ten', 'Use place value understanding and properties of operations to perform multi-digit arithmetic', '4.NBT.4', 'Fluently add and subtract multi-digit whole numbers using the standard algorithm.'),
  ('Mathematics', '4', 'Number and Operations in Base Ten', 'Use place value understanding and properties of operations to perform multi-digit arithmetic', '4.NBT.5', 'Multiply a whole number of up to four digits by a one-digit whole number, and multiply two two-digit numbers.'),
  ('Mathematics', '4', 'Number and Operations in Base Ten', 'Use place value understanding and properties of operations to perform multi-digit arithmetic', '4.NBT.6', 'Find whole-number quotients and remainders with up to four-digit dividends and one-digit divisors.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 4 - Number and Operations - Fractions
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '4', 'Number and Operations—Fractions', 'Extend understanding of fraction equivalence and ordering', '4.NF.1', 'Explain why a fraction a/b is equivalent to a fraction (n x a)/(n x b).'),
  ('Mathematics', '4', 'Number and Operations—Fractions', 'Extend understanding of fraction equivalence and ordering', '4.NF.2', 'Compare two fractions with different numerators and different denominators.'),
  ('Mathematics', '4', 'Number and Operations—Fractions', 'Build fractions from unit fractions', '4.NF.3', 'Understand a fraction a/b with a > 1 as a sum of fractions 1/b.'),
  ('Mathematics', '4', 'Number and Operations—Fractions', 'Build fractions from unit fractions', '4.NF.3a', 'Understand addition and subtraction of fractions as joining and separating parts referring to the same whole.'),
  ('Mathematics', '4', 'Number and Operations—Fractions', 'Build fractions from unit fractions', '4.NF.3b', 'Decompose a fraction into a sum of fractions with the same denominator in more than one way.'),
  ('Mathematics', '4', 'Number and Operations—Fractions', 'Build fractions from unit fractions', '4.NF.3c', 'Add and subtract mixed numbers with like denominators.'),
  ('Mathematics', '4', 'Number and Operations—Fractions', 'Build fractions from unit fractions', '4.NF.3d', 'Solve word problems involving addition and subtraction of fractions referring to the same whole and having like denominators.'),
  ('Mathematics', '4', 'Number and Operations—Fractions', 'Build fractions from unit fractions', '4.NF.4', 'Apply and extend previous understandings of multiplication to multiply a fraction by a whole number.'),
  ('Mathematics', '4', 'Number and Operations—Fractions', 'Build fractions from unit fractions', '4.NF.4a', 'Understand a fraction a/b as a multiple of 1/b.'),
  ('Mathematics', '4', 'Number and Operations—Fractions', 'Build fractions from unit fractions', '4.NF.4b', 'Understand a multiple of a/b as a multiple of 1/b, and use this understanding to multiply a fraction by a whole number.'),
  ('Mathematics', '4', 'Number and Operations—Fractions', 'Build fractions from unit fractions', '4.NF.4c', 'Solve word problems involving multiplication of a fraction by a whole number.'),
  ('Mathematics', '4', 'Number and Operations—Fractions', 'Understand decimal notation for fractions, and compare decimal fractions', '4.NF.5', 'Express a fraction with denominator 10 as an equivalent fraction with denominator 100, and use this technique to add two fractions with respective denominators 10 and 100.'),
  ('Mathematics', '4', 'Number and Operations—Fractions', 'Understand decimal notation for fractions, and compare decimal fractions', '4.NF.6', 'Use decimal notation for fractions with denominators 10 or 100.'),
  ('Mathematics', '4', 'Number and Operations—Fractions', 'Understand decimal notation for fractions, and compare decimal fractions', '4.NF.7', 'Compare two decimals to hundredths by reasoning about their size.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 4 - Measurement and Data
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '4', 'Measurement and Data', 'Solve problems involving measurement and conversion of measurements', '4.MD.1', 'Know relative sizes of measurement units within one system of units.'),
  ('Mathematics', '4', 'Measurement and Data', 'Solve problems involving measurement and conversion of measurements', '4.MD.2', 'Use the four operations to solve word problems involving distances, intervals of time, liquid volumes, masses of objects, and money.'),
  ('Mathematics', '4', 'Measurement and Data', 'Solve problems involving measurement and conversion of measurements', '4.MD.3', 'Apply the area and perimeter formulas for rectangles in real world and mathematical problems.'),
  ('Mathematics', '4', 'Measurement and Data', 'Represent and interpret data', '4.MD.4', 'Make a line plot to display a data set of measurements in fractions of a unit.'),
  ('Mathematics', '4', 'Measurement and Data', 'Geometric measurement: understand concepts of angle and measure angles', '4.MD.5', 'Recognize angles as geometric shapes that are formed wherever two rays share a common endpoint.'),
  ('Mathematics', '4', 'Measurement and Data', 'Geometric measurement: understand concepts of angle and measure angles', '4.MD.6', 'Measure angles in whole-number degrees using a protractor.'),
  ('Mathematics', '4', 'Measurement and Data', 'Geometric measurement: understand concepts of angle and measure angles', '4.MD.7', 'Recognize angle measure as additive.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 4 - Geometry
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '4', 'Geometry', 'Draw and identify lines and angles, and classify shapes by properties of their lines and angles', '4.G.1', 'Draw points, lines, line segments, rays, angles, and perpendicular and parallel lines. Identify these in two-dimensional figures.'),
  ('Mathematics', '4', 'Geometry', 'Draw and identify lines and angles, and classify shapes by properties of their lines and angles', '4.G.2', 'Classify two-dimensional figures based on the presence or absence of parallel or perpendicular lines, or the presence or absence of angles of a specified size.'),
  ('Mathematics', '4', 'Geometry', 'Draw and identify lines and angles, and classify shapes by properties of their lines and angles', '4.G.3', 'Recognize a line of symmetry for a two-dimensional figure.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 5 - Number and Operations in Base Ten
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '5', 'Number and Operations in Base Ten', 'Understand the place value system', '5.NBT.1', 'Recognize that in a multi-digit number, a digit in one place represents 10 times as much as it represents in the place to its right and 1/10 of what it represents in the place to its left.'),
  ('Mathematics', '5', 'Number and Operations in Base Ten', 'Understand the place value system', '5.NBT.2', 'Explain patterns in the number of zeros of the product when multiplying a number by powers of 10.'),
  ('Mathematics', '5', 'Number and Operations in Base Ten', 'Understand the place value system', '5.NBT.3', 'Read, write, and compare decimals to thousandths.'),
  ('Mathematics', '5', 'Number and Operations in Base Ten', 'Understand the place value system', '5.NBT.3a', 'Read and write decimals to thousandths using base-ten numerals, number names, and expanded form.'),
  ('Mathematics', '5', 'Number and Operations in Base Ten', 'Understand the place value system', '5.NBT.3b', 'Compare two decimals to thousandths based on meanings of the digits in each place.'),
  ('Mathematics', '5', 'Number and Operations in Base Ten', 'Understand the place value system', '5.NBT.4', 'Use place value understanding to round decimals to any place.'),
  ('Mathematics', '5', 'Number and Operations in Base Ten', 'Perform operations with multi-digit whole numbers and with decimals to hundredths', '5.NBT.5', 'Fluently multiply multi-digit whole numbers using the standard algorithm.'),
  ('Mathematics', '5', 'Number and Operations in Base Ten', 'Perform operations with multi-digit whole numbers and with decimals to hundredths', '5.NBT.6', 'Find whole-number quotients of whole numbers with up to four-digit dividends and two-digit divisors.'),
  ('Mathematics', '5', 'Number and Operations in Base Ten', 'Perform operations with multi-digit whole numbers and with decimals to hundredths', '5.NBT.7', 'Add, subtract, multiply, and divide decimals to hundredths.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 5 - Number and Operations - Fractions
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '5', 'Number and Operations—Fractions', 'Use equivalent fractions as a strategy to add and subtract fractions', '5.NF.1', 'Add and subtract fractions with unlike denominators.'),
  ('Mathematics', '5', 'Number and Operations—Fractions', 'Use equivalent fractions as a strategy to add and subtract fractions', '5.NF.2', 'Solve word problems involving addition and subtraction of fractions referring to the same whole.'),
  ('Mathematics', '5', 'Number and Operations—Fractions', 'Apply and extend previous understandings of multiplication and division', '5.NF.3', 'Interpret a fraction as division of the numerator by the denominator.'),
  ('Mathematics', '5', 'Number and Operations—Fractions', 'Apply and extend previous understandings of multiplication and division', '5.NF.4', 'Apply and extend previous understandings of multiplication to multiply a fraction or whole number by a fraction.'),
  ('Mathematics', '5', 'Number and Operations—Fractions', 'Apply and extend previous understandings of multiplication and division', '5.NF.4a', 'Interpret the product (a/b) x q as a parts of a partition of q into b equal parts.'),
  ('Mathematics', '5', 'Number and Operations—Fractions', 'Apply and extend previous understandings of multiplication and division', '5.NF.4b', 'Find the area of a rectangle with fractional side lengths by tiling it with unit squares.'),
  ('Mathematics', '5', 'Number and Operations—Fractions', 'Apply and extend previous understandings of multiplication and division', '5.NF.5', 'Interpret multiplication as scaling (resizing).'),
  ('Mathematics', '5', 'Number and Operations—Fractions', 'Apply and extend previous understandings of multiplication and division', '5.NF.5a', 'Comparing the size of a product to the size of one factor on the basis of the size of the other factor.'),
  ('Mathematics', '5', 'Number and Operations—Fractions', 'Apply and extend previous understandings of multiplication and division', '5.NF.5b', 'Explaining why multiplying a given number by a fraction greater than 1 results in a product greater than the given number.'),
  ('Mathematics', '5', 'Number and Operations—Fractions', 'Apply and extend previous understandings of multiplication and division', '5.NF.6', 'Solve real world problems involving multiplication of fractions and mixed numbers.'),
  ('Mathematics', '5', 'Number and Operations—Fractions', 'Apply and extend previous understandings of multiplication and division', '5.NF.7', 'Apply and extend previous understandings of division to divide unit fractions by whole numbers and whole numbers by unit fractions.'),
  ('Mathematics', '5', 'Number and Operations—Fractions', 'Apply and extend previous understandings of multiplication and division', '5.NF.7a', 'Interpret division of a unit fraction by a non-zero whole number, and compute such quotients.'),
  ('Mathematics', '5', 'Number and Operations—Fractions', 'Apply and extend previous understandings of multiplication and division', '5.NF.7b', 'Interpret division of a whole number by a unit fraction, and compute such quotients.'),
  ('Mathematics', '5', 'Number and Operations—Fractions', 'Apply and extend previous understandings of multiplication and division', '5.NF.7c', 'Solve real world problems involving division of unit fractions by non-zero whole numbers and division of whole numbers by unit fractions.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 5 - Measurement and Data
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '5', 'Measurement and Data', 'Convert like measurement units within a given measurement system', '5.MD.1', 'Convert among different-sized standard measurement units within a given measurement system.'),
  ('Mathematics', '5', 'Measurement and Data', 'Represent and interpret data', '5.MD.2', 'Make a line plot to display a data set of measurements in fractions of a unit.'),
  ('Mathematics', '5', 'Measurement and Data', 'Geometric measurement: understand concepts of volume', '5.MD.3', 'Recognize volume as an attribute of solid figures and understand concepts of volume measurement.'),
  ('Mathematics', '5', 'Measurement and Data', 'Geometric measurement: understand concepts of volume', '5.MD.3a', 'A cube with side length 1 unit, called a "unit cube," is said to have "one cubic unit" of volume.'),
  ('Mathematics', '5', 'Measurement and Data', 'Geometric measurement: understand concepts of volume', '5.MD.3b', 'A solid figure which can be packed without gaps or overlaps using n unit cubes is said to have a volume of n cubic units.'),
  ('Mathematics', '5', 'Measurement and Data', 'Geometric measurement: understand concepts of volume', '5.MD.4', 'Measure volumes by counting unit cubes.'),
  ('Mathematics', '5', 'Measurement and Data', 'Geometric measurement: understand concepts of volume', '5.MD.5', 'Relate volume to the operations of multiplication and addition and solve real world and mathematical problems involving volume.'),
  ('Mathematics', '5', 'Measurement and Data', 'Geometric measurement: understand concepts of volume', '5.MD.5a', 'Find the volume of a right rectangular prism with whole-number side lengths by packing it with unit cubes.'),
  ('Mathematics', '5', 'Measurement and Data', 'Geometric measurement: understand concepts of volume', '5.MD.5b', 'Apply the formulas V = l x w x h and V = B x h for rectangular prisms.'),
  ('Mathematics', '5', 'Measurement and Data', 'Geometric measurement: understand concepts of volume', '5.MD.5c', 'Recognize volume as additive. Find volumes of solid figures composed of two non-overlapping right rectangular prisms.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 5 - Geometry
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '5', 'Geometry', 'Graph points on the coordinate plane to solve real-world and mathematical problems', '5.G.1', 'Use a pair of perpendicular number lines, called axes, to define a coordinate system.'),
  ('Mathematics', '5', 'Geometry', 'Graph points on the coordinate plane to solve real-world and mathematical problems', '5.G.2', 'Represent real world and mathematical problems by graphing points in the first quadrant of the coordinate plane.'),
  ('Mathematics', '5', 'Geometry', 'Classify two-dimensional figures into categories based on their properties', '5.G.3', 'Understand that attributes belonging to a category of two-dimensional figures also belong to all subcategories of that category.'),
  ('Mathematics', '5', 'Geometry', 'Classify two-dimensional figures into categories based on their properties', '5.G.4', 'Classify two-dimensional figures in a hierarchy based on properties.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;
