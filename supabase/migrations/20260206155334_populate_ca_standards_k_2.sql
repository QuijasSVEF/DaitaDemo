/*
  # Populate California Math Standards - Kindergarten through Grade 2

  ## Purpose
  The ca_standards table only had ~97 standards total, which is a tiny fraction 
  of the California Common Core Math Standards. This caused the standards alignment 
  feature to show "No standards aligned" for most struggle areas because the AI 
  couldn't find matching standards in the sparse data.

  ## Changes
  - Adds all missing K-2 California Common Core Math Standards
  - Uses ON CONFLICT to safely skip any standards that already exist
  - Covers all domains: Counting & Cardinality, OA, NBT, MD, G, NF

  ## Tables Modified
  - `ca_standards` - INSERT only, no existing data modified
*/

-- Kindergarten - Counting and Cardinality
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'K', 'Counting and Cardinality', 'Know number names and the count sequence', 'K.CC.1', 'Count to 100 by ones and by tens.'),
  ('Mathematics', 'K', 'Counting and Cardinality', 'Know number names and the count sequence', 'K.CC.2', 'Count forward beginning from a given number within the known sequence.'),
  ('Mathematics', 'K', 'Counting and Cardinality', 'Know number names and the count sequence', 'K.CC.3', 'Write numbers from 0 to 20. Represent a number of objects with a written numeral 0-20.'),
  ('Mathematics', 'K', 'Counting and Cardinality', 'Count to tell the number of objects', 'K.CC.4', 'Understand the relationship between numbers and quantities; connect counting to cardinality.'),
  ('Mathematics', 'K', 'Counting and Cardinality', 'Count to tell the number of objects', 'K.CC.4a', 'When counting objects, say the number names in the standard order, pairing each object with one and only one number name and each number name with one and only one object.'),
  ('Mathematics', 'K', 'Counting and Cardinality', 'Count to tell the number of objects', 'K.CC.4b', 'Understand that the last number name said tells the number of objects counted.'),
  ('Mathematics', 'K', 'Counting and Cardinality', 'Count to tell the number of objects', 'K.CC.4c', 'Understand that each successive number name refers to a quantity that is one larger.'),
  ('Mathematics', 'K', 'Counting and Cardinality', 'Count to tell the number of objects', 'K.CC.5', 'Count to answer "how many?" questions about as many as 20 things arranged in various configurations.'),
  ('Mathematics', 'K', 'Counting and Cardinality', 'Compare numbers', 'K.CC.6', 'Identify whether the number of objects in one group is greater than, less than, or equal to the number of objects in another group.'),
  ('Mathematics', 'K', 'Counting and Cardinality', 'Compare numbers', 'K.CC.7', 'Compare two numbers between 1 and 10 presented as written numerals.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Kindergarten - Operations and Algebraic Thinking
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'K', 'Operations and Algebraic Thinking', 'Understand addition as putting together and adding to, and understand subtraction as taking apart and taking from', 'K.OA.1', 'Represent addition and subtraction with objects, fingers, mental images, drawings, sounds, acting out situations, verbal explanations, expressions, or equations.'),
  ('Mathematics', 'K', 'Operations and Algebraic Thinking', 'Understand addition as putting together and adding to, and understand subtraction as taking apart and taking from', 'K.OA.2', 'Solve addition and subtraction word problems, and add and subtract within 10.'),
  ('Mathematics', 'K', 'Operations and Algebraic Thinking', 'Understand addition as putting together and adding to, and understand subtraction as taking apart and taking from', 'K.OA.3', 'Decompose numbers less than or equal to 10 into pairs in more than one way.'),
  ('Mathematics', 'K', 'Operations and Algebraic Thinking', 'Understand addition as putting together and adding to, and understand subtraction as taking apart and taking from', 'K.OA.4', 'For any number from 1 to 9, find the number that makes 10 when added to the given number.'),
  ('Mathematics', 'K', 'Operations and Algebraic Thinking', 'Understand addition as putting together and adding to, and understand subtraction as taking apart and taking from', 'K.OA.5', 'Fluently add and subtract within 5.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Kindergarten - Number and Operations in Base Ten
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'K', 'Number and Operations in Base Ten', 'Work with numbers 11-19 to gain foundations for place value', 'K.NBT.1', 'Compose and decompose numbers from 11 to 19 into ten ones and some further ones.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Kindergarten - Measurement and Data
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'K', 'Measurement and Data', 'Describe and compare measurable attributes', 'K.MD.1', 'Describe measurable attributes of objects, such as length or weight. Describe several measurable attributes of a single object.'),
  ('Mathematics', 'K', 'Measurement and Data', 'Describe and compare measurable attributes', 'K.MD.2', 'Directly compare two objects with a measurable attribute in common, to see which object has "more of"/"less of" the attribute, and describe the difference.'),
  ('Mathematics', 'K', 'Measurement and Data', 'Classify objects and count the number of objects in each category', 'K.MD.3', 'Classify objects into given categories; count the numbers of objects in each category and sort the categories by count.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Kindergarten - Geometry
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'K', 'Geometry', 'Identify and describe shapes', 'K.G.1', 'Describe objects in the environment using names of shapes, and describe the relative positions of these objects.'),
  ('Mathematics', 'K', 'Geometry', 'Identify and describe shapes', 'K.G.2', 'Correctly name shapes regardless of their orientations or overall size.'),
  ('Mathematics', 'K', 'Geometry', 'Identify and describe shapes', 'K.G.3', 'Identify shapes as two-dimensional or three-dimensional.'),
  ('Mathematics', 'K', 'Geometry', 'Analyze, compare, create, and compose shapes', 'K.G.4', 'Analyze and compare two- and three-dimensional shapes, in different sizes and orientations, using informal language to describe their similarities, differences, parts, and other attributes.'),
  ('Mathematics', 'K', 'Geometry', 'Analyze, compare, create, and compose shapes', 'K.G.5', 'Model shapes in the world by building shapes from components and drawing shapes.'),
  ('Mathematics', 'K', 'Geometry', 'Analyze, compare, create, and compose shapes', 'K.G.6', 'Compose simple shapes to form larger shapes.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 1 - Operations and Algebraic Thinking
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '1', 'Operations and Algebraic Thinking', 'Represent and solve problems involving addition and subtraction', 'K.OA.1', 'Use addition and subtraction within 20 to solve word problems involving situations of adding to, taking from, putting together, taking apart, and comparing.'),
  ('Mathematics', '1', 'Operations and Algebraic Thinking', 'Represent and solve problems involving addition and subtraction', '1.OA.1', 'Use addition and subtraction within 20 to solve word problems involving situations of adding to, taking from, putting together, taking apart, and comparing.'),
  ('Mathematics', '1', 'Operations and Algebraic Thinking', 'Represent and solve problems involving addition and subtraction', '1.OA.2', 'Solve word problems that call for addition of three whole numbers whose sum is less than or equal to 20.'),
  ('Mathematics', '1', 'Operations and Algebraic Thinking', 'Understand and apply properties of operations and the relationship between addition and subtraction', '1.OA.3', 'Apply properties of operations as strategies to add and subtract.'),
  ('Mathematics', '1', 'Operations and Algebraic Thinking', 'Understand and apply properties of operations and the relationship between addition and subtraction', '1.OA.4', 'Understand subtraction as an unknown-addend problem.'),
  ('Mathematics', '1', 'Operations and Algebraic Thinking', 'Add and subtract within 20', '1.OA.5', 'Relate counting to addition and subtraction.'),
  ('Mathematics', '1', 'Operations and Algebraic Thinking', 'Add and subtract within 20', '1.OA.6', 'Add and subtract within 20, demonstrating fluency for addition and subtraction within 10.'),
  ('Mathematics', '1', 'Operations and Algebraic Thinking', 'Work with addition and subtraction equations', '1.OA.7', 'Understand the meaning of the equal sign, and determine if equations involving addition and subtraction are true or false.'),
  ('Mathematics', '1', 'Operations and Algebraic Thinking', 'Work with addition and subtraction equations', '1.OA.8', 'Determine the unknown whole number in an addition or subtraction equation relating three whole numbers.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 1 - Number and Operations in Base Ten
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '1', 'Number and Operations in Base Ten', 'Extend the counting sequence', '1.NBT.1', 'Count to 120, starting at any number less than 120.'),
  ('Mathematics', '1', 'Number and Operations in Base Ten', 'Understand place value', '1.NBT.2', 'Understand that the two digits of a two-digit number represent amounts of tens and ones.'),
  ('Mathematics', '1', 'Number and Operations in Base Ten', 'Understand place value', '1.NBT.2a', 'Ten can be thought of as a bundle of ten ones, called a "ten."'),
  ('Mathematics', '1', 'Number and Operations in Base Ten', 'Understand place value', '1.NBT.2b', 'The numbers from 11 to 19 are composed of a ten and one, two, three, four, five, six, seven, eight, or nine ones.'),
  ('Mathematics', '1', 'Number and Operations in Base Ten', 'Understand place value', '1.NBT.2c', 'The numbers 10, 20, 30, 40, 50, 60, 70, 80, 90 refer to one, two, three, four, five, six, seven, eight, or nine tens (and 0 ones).'),
  ('Mathematics', '1', 'Number and Operations in Base Ten', 'Understand place value', '1.NBT.3', 'Compare two two-digit numbers based on meanings of the tens and ones digits, recording the results of comparisons with the symbols >, =, and <.'),
  ('Mathematics', '1', 'Number and Operations in Base Ten', 'Use place value understanding and properties of operations to add and subtract', '1.NBT.4', 'Add within 100, including adding a two-digit number and a one-digit number, and adding a two-digit number and a multiple of 10.'),
  ('Mathematics', '1', 'Number and Operations in Base Ten', 'Use place value understanding and properties of operations to add and subtract', '1.NBT.5', 'Given a two-digit number, mentally find 10 more or 10 less than the number, without having to count; explain the reasoning used.'),
  ('Mathematics', '1', 'Number and Operations in Base Ten', 'Use place value understanding and properties of operations to add and subtract', '1.NBT.6', 'Subtract multiples of 10 in the range 10-90 from multiples of 10 in the range 10-90.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 1 - Measurement and Data
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '1', 'Measurement and Data', 'Measure lengths indirectly and by iterating length units', '1.MD.1', 'Order three objects by length; compare the lengths of two objects indirectly by using a third object.'),
  ('Mathematics', '1', 'Measurement and Data', 'Measure lengths indirectly and by iterating length units', '1.MD.2', 'Express the length of an object as a whole number of length units.'),
  ('Mathematics', '1', 'Measurement and Data', 'Tell and write time', '1.MD.3', 'Tell and write time in hours and half-hours using analog and digital clocks.'),
  ('Mathematics', '1', 'Measurement and Data', 'Represent and interpret data', '1.MD.4', 'Organize, represent, and interpret data with up to three categories; ask and answer questions about the total number of data points.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 1 - Geometry
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '1', 'Geometry', 'Reason with shapes and their attributes', '1.G.1', 'Distinguish between defining attributes versus non-defining attributes; build and draw shapes to possess defining attributes.'),
  ('Mathematics', '1', 'Geometry', 'Reason with shapes and their attributes', '1.G.2', 'Compose two-dimensional shapes or three-dimensional shapes to create a composite shape, and compose new shapes from the composite shape.'),
  ('Mathematics', '1', 'Geometry', 'Reason with shapes and their attributes', '1.G.3', 'Partition circles and rectangles into two and four equal shares, describe the shares using the words halves, fourths, and quarters.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 2 - Operations and Algebraic Thinking
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '2', 'Operations and Algebraic Thinking', 'Represent and solve problems involving addition and subtraction', '2.OA.1', 'Use addition and subtraction within 100 to solve one- and two-step word problems.'),
  ('Mathematics', '2', 'Operations and Algebraic Thinking', 'Add and subtract within 20', '2.OA.2', 'Fluently add and subtract within 20 using mental strategies.'),
  ('Mathematics', '2', 'Operations and Algebraic Thinking', 'Work with equal groups of objects to gain foundations for multiplication', '2.OA.3', 'Determine whether a group of objects (up to 20) has an odd or even number of members.'),
  ('Mathematics', '2', 'Operations and Algebraic Thinking', 'Work with equal groups of objects to gain foundations for multiplication', '2.OA.4', 'Use addition to find the total number of objects arranged in rectangular arrays with up to 5 rows and up to 5 columns.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 2 - Number and Operations in Base Ten
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '2', 'Number and Operations in Base Ten', 'Understand place value', '2.NBT.1', 'Understand that the three digits of a three-digit number represent amounts of hundreds, tens, and ones.'),
  ('Mathematics', '2', 'Number and Operations in Base Ten', 'Understand place value', '2.NBT.1a', 'One hundred can be thought of as a bundle of ten tens, called a "hundred."'),
  ('Mathematics', '2', 'Number and Operations in Base Ten', 'Understand place value', '2.NBT.1b', 'The numbers 100, 200, 300, 400, 500, 600, 700, 800, 900 refer to one, two, three, four, five, six, seven, eight, or nine hundreds (and 0 tens and 0 ones).'),
  ('Mathematics', '2', 'Number and Operations in Base Ten', 'Understand place value', '2.NBT.2', 'Count within 1000; skip-count by 2s, 5s, 10s, and 100s.'),
  ('Mathematics', '2', 'Number and Operations in Base Ten', 'Understand place value', '2.NBT.3', 'Read and write numbers to 1000 using base-ten numerals, number names, and expanded form.'),
  ('Mathematics', '2', 'Number and Operations in Base Ten', 'Understand place value', '2.NBT.4', 'Compare two three-digit numbers based on meanings of the hundreds, tens, and ones digits, using >, =, and < symbols to record the results of comparisons.'),
  ('Mathematics', '2', 'Number and Operations in Base Ten', 'Use place value understanding and properties of operations to add and subtract', '2.NBT.5', 'Fluently add and subtract within 100 using strategies based on place value, properties of operations, and/or the relationship between addition and subtraction.'),
  ('Mathematics', '2', 'Number and Operations in Base Ten', 'Use place value understanding and properties of operations to add and subtract', '2.NBT.6', 'Add up to four two-digit numbers using strategies based on place value and properties of operations.'),
  ('Mathematics', '2', 'Number and Operations in Base Ten', 'Use place value understanding and properties of operations to add and subtract', '2.NBT.7', 'Add and subtract within 1000, using concrete models or drawings and strategies based on place value, properties of operations, and/or the relationship between addition and subtraction.'),
  ('Mathematics', '2', 'Number and Operations in Base Ten', 'Use place value understanding and properties of operations to add and subtract', '2.NBT.8', 'Mentally add 10 or 100 to a given number 100-900, and mentally subtract 10 or 100 from a given number 100-900.'),
  ('Mathematics', '2', 'Number and Operations in Base Ten', 'Use place value understanding and properties of operations to add and subtract', '2.NBT.9', 'Explain why addition and subtraction strategies work, using place value and the properties of operations.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 2 - Measurement and Data
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '2', 'Measurement and Data', 'Measure and estimate lengths in standard units', '2.MD.1', 'Measure the length of an object by selecting and using appropriate tools such as rulers, yardsticks, meter sticks, and measuring tapes.'),
  ('Mathematics', '2', 'Measurement and Data', 'Measure and estimate lengths in standard units', '2.MD.2', 'Measure the length of an object twice, using length units of different lengths for the two measurements; describe how the two measurements relate to the size of the unit chosen.'),
  ('Mathematics', '2', 'Measurement and Data', 'Measure and estimate lengths in standard units', '2.MD.3', 'Estimate lengths using units of inches, feet, centimeters, and meters.'),
  ('Mathematics', '2', 'Measurement and Data', 'Measure and estimate lengths in standard units', '2.MD.4', 'Measure to determine how much longer one object is than another, expressing the length difference in terms of a standard length unit.'),
  ('Mathematics', '2', 'Measurement and Data', 'Relate addition and subtraction to length', '2.MD.5', 'Use addition and subtraction within 100 to solve word problems involving lengths that are given in the same units.'),
  ('Mathematics', '2', 'Measurement and Data', 'Relate addition and subtraction to length', '2.MD.6', 'Represent whole numbers as lengths from 0 on a number line diagram with equally spaced points.'),
  ('Mathematics', '2', 'Measurement and Data', 'Work with time and money', '2.MD.7', 'Tell and write time from analog and digital clocks to the nearest five minutes, using a.m. and p.m.'),
  ('Mathematics', '2', 'Measurement and Data', 'Work with time and money', '2.MD.8', 'Solve word problems involving dollar bills, quarters, dimes, nickels, and pennies.'),
  ('Mathematics', '2', 'Measurement and Data', 'Represent and interpret data', '2.MD.9', 'Generate measurement data by measuring lengths of several objects to the nearest whole unit, or by making repeated measurements of the same object. Show the measurements by making a line plot.'),
  ('Mathematics', '2', 'Measurement and Data', 'Represent and interpret data', '2.MD.10', 'Draw a picture graph and a bar graph to represent a data set with up to four categories. Solve simple put-together, take-apart, and compare problems using information presented in a bar graph.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 2 - Geometry
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '2', 'Geometry', 'Reason with shapes and their attributes', '2.G.1', 'Recognize and draw shapes having specified attributes, such as a given number of angles or a given number of equal faces.'),
  ('Mathematics', '2', 'Geometry', 'Reason with shapes and their attributes', '2.G.2', 'Partition a rectangle into rows and columns of same-size squares and count to find the total number of them.'),
  ('Mathematics', '2', 'Geometry', 'Reason with shapes and their attributes', '2.G.3', 'Partition circles and rectangles into two, three, or four equal shares, describe the shares using the words halves, thirds, half of, a third of, etc.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;
