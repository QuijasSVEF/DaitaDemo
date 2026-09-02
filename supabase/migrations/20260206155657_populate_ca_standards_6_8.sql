/*
  # Populate California Math Standards - Grades 6 through 8

  ## Purpose
  Continues populating comprehensive California Common Core Math Standards.
  
  ## Changes
  - Adds all missing Grade 6, 7, and 8 standards
  - Covers RP, NS, EE, G, SP, F domains for each grade
  
  ## Tables Modified
  - `ca_standards` - INSERT only
*/

-- Grade 6 - Ratios and Proportional Relationships
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '6', 'Ratios and Proportional Relationships', 'Understand ratio concepts and use ratio reasoning to solve problems', '6.RP.1', 'Understand the concept of a ratio and use ratio language to describe a ratio relationship between two quantities.'),
  ('Mathematics', '6', 'Ratios and Proportional Relationships', 'Understand ratio concepts and use ratio reasoning to solve problems', '6.RP.2', 'Understand the concept of a unit rate a/b associated with a ratio a:b with b not equal to 0.'),
  ('Mathematics', '6', 'Ratios and Proportional Relationships', 'Understand ratio concepts and use ratio reasoning to solve problems', '6.RP.3', 'Use ratio and rate reasoning to solve real-world and mathematical problems.'),
  ('Mathematics', '6', 'Ratios and Proportional Relationships', 'Understand ratio concepts and use ratio reasoning to solve problems', '6.RP.3a', 'Make tables of equivalent ratios relating quantities with whole-number measurements.'),
  ('Mathematics', '6', 'Ratios and Proportional Relationships', 'Understand ratio concepts and use ratio reasoning to solve problems', '6.RP.3b', 'Solve unit rate problems including those involving unit pricing and constant speed.'),
  ('Mathematics', '6', 'Ratios and Proportional Relationships', 'Understand ratio concepts and use ratio reasoning to solve problems', '6.RP.3c', 'Find a percent of a quantity as a rate per 100.'),
  ('Mathematics', '6', 'Ratios and Proportional Relationships', 'Understand ratio concepts and use ratio reasoning to solve problems', '6.RP.3d', 'Use ratio reasoning to convert measurement units; manipulate and transform units appropriately when multiplying or dividing quantities.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 6 - The Number System
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '6', 'The Number System', 'Apply and extend previous understandings of multiplication and division to divide fractions by fractions', '6.NS.1', 'Interpret and compute quotients of fractions, and solve word problems involving division of fractions by fractions.'),
  ('Mathematics', '6', 'The Number System', 'Compute fluently with multi-digit numbers and find common factors and multiples', '6.NS.2', 'Fluently divide multi-digit numbers using the standard algorithm.'),
  ('Mathematics', '6', 'The Number System', 'Compute fluently with multi-digit numbers and find common factors and multiples', '6.NS.3', 'Fluently add, subtract, multiply, and divide multi-digit decimals using the standard algorithm for each operation.'),
  ('Mathematics', '6', 'The Number System', 'Compute fluently with multi-digit numbers and find common factors and multiples', '6.NS.4', 'Find the greatest common factor of two whole numbers less than or equal to 100 and the least common multiple of two whole numbers less than or equal to 12.'),
  ('Mathematics', '6', 'The Number System', 'Apply and extend previous understandings of numbers to the system of rational numbers', '6.NS.5', 'Understand that positive and negative numbers are used together to describe quantities having opposite directions or values.'),
  ('Mathematics', '6', 'The Number System', 'Apply and extend previous understandings of numbers to the system of rational numbers', '6.NS.6', 'Understand a rational number as a point on the number line.'),
  ('Mathematics', '6', 'The Number System', 'Apply and extend previous understandings of numbers to the system of rational numbers', '6.NS.6a', 'Recognize opposite signs of numbers as indicating locations on opposite sides of 0 on the number line.'),
  ('Mathematics', '6', 'The Number System', 'Apply and extend previous understandings of numbers to the system of rational numbers', '6.NS.6b', 'Understand signs of numbers in ordered pairs as indicating locations in quadrants of the coordinate plane.'),
  ('Mathematics', '6', 'The Number System', 'Apply and extend previous understandings of numbers to the system of rational numbers', '6.NS.6c', 'Find and position integers and other rational numbers on a horizontal or vertical number line diagram.'),
  ('Mathematics', '6', 'The Number System', 'Apply and extend previous understandings of numbers to the system of rational numbers', '6.NS.7', 'Understand ordering and absolute value of rational numbers.'),
  ('Mathematics', '6', 'The Number System', 'Apply and extend previous understandings of numbers to the system of rational numbers', '6.NS.7a', 'Interpret statements of inequality as statements about the relative position of two numbers on a number line diagram.'),
  ('Mathematics', '6', 'The Number System', 'Apply and extend previous understandings of numbers to the system of rational numbers', '6.NS.7b', 'Write, interpret, and explain statements of order for rational numbers in real-world contexts.'),
  ('Mathematics', '6', 'The Number System', 'Apply and extend previous understandings of numbers to the system of rational numbers', '6.NS.7c', 'Understand the absolute value of a rational number as its distance from 0 on the number line.'),
  ('Mathematics', '6', 'The Number System', 'Apply and extend previous understandings of numbers to the system of rational numbers', '6.NS.7d', 'Distinguish comparisons of absolute value from statements about order.'),
  ('Mathematics', '6', 'The Number System', 'Apply and extend previous understandings of numbers to the system of rational numbers', '6.NS.8', 'Solve real-world and mathematical problems by graphing points in all four quadrants of the coordinate plane.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 6 - Expressions and Equations
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '6', 'Expressions and Equations', 'Apply and extend previous understandings of arithmetic to algebraic expressions', '6.EE.1', 'Write and evaluate numerical expressions involving whole-number exponents.'),
  ('Mathematics', '6', 'Expressions and Equations', 'Apply and extend previous understandings of arithmetic to algebraic expressions', '6.EE.2', 'Write, read, and evaluate expressions in which letters stand for numbers.'),
  ('Mathematics', '6', 'Expressions and Equations', 'Apply and extend previous understandings of arithmetic to algebraic expressions', '6.EE.2a', 'Write expressions that record operations with numbers and with letters standing for numbers.'),
  ('Mathematics', '6', 'Expressions and Equations', 'Apply and extend previous understandings of arithmetic to algebraic expressions', '6.EE.2b', 'Identify parts of an expression using mathematical terms (sum, term, product, factor, quotient, coefficient).'),
  ('Mathematics', '6', 'Expressions and Equations', 'Apply and extend previous understandings of arithmetic to algebraic expressions', '6.EE.2c', 'Evaluate expressions at specific values of their variables.'),
  ('Mathematics', '6', 'Expressions and Equations', 'Apply and extend previous understandings of arithmetic to algebraic expressions', '6.EE.3', 'Apply the properties of operations to generate equivalent expressions.'),
  ('Mathematics', '6', 'Expressions and Equations', 'Apply and extend previous understandings of arithmetic to algebraic expressions', '6.EE.4', 'Identify when two expressions are equivalent.'),
  ('Mathematics', '6', 'Expressions and Equations', 'Reason about and solve one-variable equations and inequalities', '6.EE.5', 'Understand solving an equation or inequality as a process of answering a question.'),
  ('Mathematics', '6', 'Expressions and Equations', 'Reason about and solve one-variable equations and inequalities', '6.EE.6', 'Use variables to represent numbers and write expressions when solving a real-world or mathematical problem.'),
  ('Mathematics', '6', 'Expressions and Equations', 'Reason about and solve one-variable equations and inequalities', '6.EE.7', 'Solve real-world and mathematical problems by writing and solving equations of the form x + p = q and px = q.'),
  ('Mathematics', '6', 'Expressions and Equations', 'Reason about and solve one-variable equations and inequalities', '6.EE.8', 'Write an inequality of the form x > c or x < c to represent a constraint or condition in a real-world or mathematical problem.'),
  ('Mathematics', '6', 'Expressions and Equations', 'Represent and analyze quantitative relationships between dependent and independent variables', '6.EE.9', 'Use variables to represent two quantities in a real-world problem that change in relationship to one another.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 6 - Geometry
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '6', 'Geometry', 'Solve real-world and mathematical problems involving area, surface area, and volume', '6.G.1', 'Find the area of right triangles, other triangles, special quadrilaterals, and polygons.'),
  ('Mathematics', '6', 'Geometry', 'Solve real-world and mathematical problems involving area, surface area, and volume', '6.G.2', 'Find the volume of a right rectangular prism with fractional edge lengths.'),
  ('Mathematics', '6', 'Geometry', 'Solve real-world and mathematical problems involving area, surface area, and volume', '6.G.3', 'Draw polygons in the coordinate plane given coordinates for the vertices.'),
  ('Mathematics', '6', 'Geometry', 'Solve real-world and mathematical problems involving area, surface area, and volume', '6.G.4', 'Represent three-dimensional figures using nets made up of rectangles and triangles, and use the nets to find the surface area of these figures.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 6 - Statistics and Probability
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '6', 'Statistics and Probability', 'Develop understanding of statistical variability', '6.SP.1', 'Recognize a statistical question as one that anticipates variability in the data.'),
  ('Mathematics', '6', 'Statistics and Probability', 'Develop understanding of statistical variability', '6.SP.2', 'Understand that a set of data collected to answer a statistical question has a distribution which can be described by its center, spread, and overall shape.'),
  ('Mathematics', '6', 'Statistics and Probability', 'Develop understanding of statistical variability', '6.SP.3', 'Recognize that a measure of center for a numerical data set summarizes all of its values with a single number, while a measure of variation describes how its values vary with a single number.'),
  ('Mathematics', '6', 'Statistics and Probability', 'Summarize and describe distributions', '6.SP.4', 'Display numerical data in plots on a number line, including dot plots, histograms, and box plots.'),
  ('Mathematics', '6', 'Statistics and Probability', 'Summarize and describe distributions', '6.SP.5', 'Summarize numerical data sets in relation to their context.'),
  ('Mathematics', '6', 'Statistics and Probability', 'Summarize and describe distributions', '6.SP.5a', 'Reporting the number of observations.'),
  ('Mathematics', '6', 'Statistics and Probability', 'Summarize and describe distributions', '6.SP.5b', 'Describing the nature of the attribute under investigation, including how it was measured and its units of measurement.'),
  ('Mathematics', '6', 'Statistics and Probability', 'Summarize and describe distributions', '6.SP.5c', 'Giving quantitative measures of center (median and/or mean) and variability (interquartile range and/or mean absolute deviation).'),
  ('Mathematics', '6', 'Statistics and Probability', 'Summarize and describe distributions', '6.SP.5d', 'Relating the choice of measures of center and variability to the shape of the data distribution and the context in which the data were gathered.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 7 - Ratios and Proportional Relationships
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '7', 'Ratios and Proportional Relationships', 'Analyze proportional relationships and use them to solve real-world and mathematical problems', '7.RP.1', 'Compute unit rates associated with ratios of fractions.'),
  ('Mathematics', '7', 'Ratios and Proportional Relationships', 'Analyze proportional relationships and use them to solve real-world and mathematical problems', '7.RP.2', 'Recognize and represent proportional relationships between quantities.'),
  ('Mathematics', '7', 'Ratios and Proportional Relationships', 'Analyze proportional relationships and use them to solve real-world and mathematical problems', '7.RP.2a', 'Decide whether two quantities are in a proportional relationship.'),
  ('Mathematics', '7', 'Ratios and Proportional Relationships', 'Analyze proportional relationships and use them to solve real-world and mathematical problems', '7.RP.2b', 'Identify the constant of proportionality (unit rate) in tables, graphs, equations, diagrams, and verbal descriptions.'),
  ('Mathematics', '7', 'Ratios and Proportional Relationships', 'Analyze proportional relationships and use them to solve real-world and mathematical problems', '7.RP.2c', 'Represent proportional relationships by equations.'),
  ('Mathematics', '7', 'Ratios and Proportional Relationships', 'Analyze proportional relationships and use them to solve real-world and mathematical problems', '7.RP.2d', 'Explain what a point (x, y) on the graph of a proportional relationship means in terms of the situation.'),
  ('Mathematics', '7', 'Ratios and Proportional Relationships', 'Analyze proportional relationships and use them to solve real-world and mathematical problems', '7.RP.3', 'Use proportional relationships to solve multistep ratio and percent problems.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 7 - The Number System
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '7', 'The Number System', 'Apply and extend previous understandings of operations with fractions', '7.NS.1', 'Apply and extend previous understandings of addition and subtraction to add and subtract rational numbers.'),
  ('Mathematics', '7', 'The Number System', 'Apply and extend previous understandings of operations with fractions', '7.NS.1a', 'Describe situations in which opposite quantities combine to make 0.'),
  ('Mathematics', '7', 'The Number System', 'Apply and extend previous understandings of operations with fractions', '7.NS.1b', 'Understand p + q as the number located a distance |q| from p, in the positive or negative direction.'),
  ('Mathematics', '7', 'The Number System', 'Apply and extend previous understandings of operations with fractions', '7.NS.1c', 'Understand subtraction of rational numbers as adding the additive inverse.'),
  ('Mathematics', '7', 'The Number System', 'Apply and extend previous understandings of operations with fractions', '7.NS.1d', 'Apply properties of operations as strategies to add and subtract rational numbers.'),
  ('Mathematics', '7', 'The Number System', 'Apply and extend previous understandings of operations with fractions', '7.NS.2', 'Apply and extend previous understandings of multiplication and division and of fractions to multiply and divide rational numbers.'),
  ('Mathematics', '7', 'The Number System', 'Apply and extend previous understandings of operations with fractions', '7.NS.2a', 'Understand that multiplication is extended from fractions to rational numbers by requiring that operations continue to satisfy the properties of operations.'),
  ('Mathematics', '7', 'The Number System', 'Apply and extend previous understandings of operations with fractions', '7.NS.2b', 'Understand that integers can be divided, provided that the divisor is not zero, and every quotient of integers is a rational number.'),
  ('Mathematics', '7', 'The Number System', 'Apply and extend previous understandings of operations with fractions', '7.NS.2c', 'Apply properties of operations as strategies to multiply and divide rational numbers.'),
  ('Mathematics', '7', 'The Number System', 'Apply and extend previous understandings of operations with fractions', '7.NS.2d', 'Convert a rational number to a decimal using long division; know that the decimal form of a rational number terminates in 0s or eventually repeats.'),
  ('Mathematics', '7', 'The Number System', 'Apply and extend previous understandings of operations with fractions', '7.NS.3', 'Solve real-world and mathematical problems involving the four operations with rational numbers.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 7 - Expressions and Equations
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '7', 'Expressions and Equations', 'Use properties of operations to generate equivalent expressions', '7.EE.1', 'Apply properties of operations as strategies to add, subtract, factor, and expand linear expressions with rational coefficients.'),
  ('Mathematics', '7', 'Expressions and Equations', 'Use properties of operations to generate equivalent expressions', '7.EE.2', 'Understand that rewriting an expression in different forms in a problem context can shed light on the problem.'),
  ('Mathematics', '7', 'Expressions and Equations', 'Solve real-life and mathematical problems using numerical and algebraic expressions and equations', '7.EE.3', 'Solve multi-step real-life and mathematical problems posed with positive and negative rational numbers.'),
  ('Mathematics', '7', 'Expressions and Equations', 'Solve real-life and mathematical problems using numerical and algebraic expressions and equations', '7.EE.4', 'Use variables to represent quantities in a real-world or mathematical problem, and construct simple equations and inequalities to solve problems.'),
  ('Mathematics', '7', 'Expressions and Equations', 'Solve real-life and mathematical problems using numerical and algebraic expressions and equations', '7.EE.4a', 'Solve word problems leading to equations of the form px + q = r and p(x + q) = r.'),
  ('Mathematics', '7', 'Expressions and Equations', 'Solve real-life and mathematical problems using numerical and algebraic expressions and equations', '7.EE.4b', 'Solve word problems leading to inequalities of the form px + q > r or px + q < r.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 7 - Geometry
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '7', 'Geometry', 'Draw, construct, and describe geometrical figures and describe the relationships between them', '7.G.1', 'Solve problems involving scale drawings of geometric figures.'),
  ('Mathematics', '7', 'Geometry', 'Draw, construct, and describe geometrical figures and describe the relationships between them', '7.G.2', 'Draw (freehand, with ruler and protractor, and with technology) geometric shapes with given conditions.'),
  ('Mathematics', '7', 'Geometry', 'Draw, construct, and describe geometrical figures and describe the relationships between them', '7.G.3', 'Describe the two-dimensional figures that result from slicing three-dimensional figures.'),
  ('Mathematics', '7', 'Geometry', 'Solve real-life and mathematical problems involving angle measure, area, surface area, and volume', '7.G.4', 'Know the formulas for the area and circumference of a circle and use them to solve problems.'),
  ('Mathematics', '7', 'Geometry', 'Solve real-life and mathematical problems involving angle measure, area, surface area, and volume', '7.G.5', 'Use facts about supplementary, complementary, vertical, and adjacent angles in a multi-step problem.'),
  ('Mathematics', '7', 'Geometry', 'Solve real-life and mathematical problems involving angle measure, area, surface area, and volume', '7.G.6', 'Solve real-world and mathematical problems involving area, volume and surface area of two- and three-dimensional objects.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 7 - Statistics and Probability
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '7', 'Statistics and Probability', 'Use random sampling to draw inferences about a population', '7.SP.1', 'Understand that statistics can be used to gain information about a population by examining a sample of the population.'),
  ('Mathematics', '7', 'Statistics and Probability', 'Use random sampling to draw inferences about a population', '7.SP.2', 'Use data from a random sample to draw inferences about a population with an unknown characteristic of interest.'),
  ('Mathematics', '7', 'Statistics and Probability', 'Draw informal comparative inferences about two populations', '7.SP.3', 'Informally assess the degree of visual overlap of two numerical data distributions with similar variabilities.'),
  ('Mathematics', '7', 'Statistics and Probability', 'Draw informal comparative inferences about two populations', '7.SP.4', 'Use measures of center and measures of variability for numerical data from random samples to draw informal comparative inferences about two populations.'),
  ('Mathematics', '7', 'Statistics and Probability', 'Investigate chance processes and develop, use, and evaluate probability models', '7.SP.5', 'Understand that the probability of a chance event is a number between 0 and 1.'),
  ('Mathematics', '7', 'Statistics and Probability', 'Investigate chance processes and develop, use, and evaluate probability models', '7.SP.6', 'Approximate the probability of a chance event by collecting data on the chance process.'),
  ('Mathematics', '7', 'Statistics and Probability', 'Investigate chance processes and develop, use, and evaluate probability models', '7.SP.7', 'Develop a probability model and use it to find probabilities of events.'),
  ('Mathematics', '7', 'Statistics and Probability', 'Investigate chance processes and develop, use, and evaluate probability models', '7.SP.7a', 'Develop a uniform probability model by assigning equal probability to all outcomes.'),
  ('Mathematics', '7', 'Statistics and Probability', 'Investigate chance processes and develop, use, and evaluate probability models', '7.SP.7b', 'Develop a probability model (which may not be uniform) by observing frequencies in data generated from a chance process.'),
  ('Mathematics', '7', 'Statistics and Probability', 'Investigate chance processes and develop, use, and evaluate probability models', '7.SP.8', 'Find probabilities of compound events using organized lists, tables, tree diagrams, and simulation.'),
  ('Mathematics', '7', 'Statistics and Probability', 'Investigate chance processes and develop, use, and evaluate probability models', '7.SP.8a', 'Understand that the probability of a compound event is the fraction of outcomes in the sample space for which the compound event occurs.'),
  ('Mathematics', '7', 'Statistics and Probability', 'Investigate chance processes and develop, use, and evaluate probability models', '7.SP.8b', 'Represent sample spaces for compound events using methods such as organized lists, tables and tree diagrams.'),
  ('Mathematics', '7', 'Statistics and Probability', 'Investigate chance processes and develop, use, and evaluate probability models', '7.SP.8c', 'Design and use a simulation to generate frequencies for compound events.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 8 - The Number System
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '8', 'The Number System', 'Know that there are numbers that are not rational, and approximate them by rational numbers', '8.NS.1', 'Know that numbers that are not rational are called irrational. Understand informally that every number has a decimal expansion.'),
  ('Mathematics', '8', 'The Number System', 'Know that there are numbers that are not rational, and approximate them by rational numbers', '8.NS.2', 'Use rational approximations of irrational numbers to compare the size of irrational numbers.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 8 - Expressions and Equations
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '8', 'Expressions and Equations', 'Work with radicals and integer exponents', '8.EE.1', 'Know and apply the properties of integer exponents to generate equivalent numerical expressions.'),
  ('Mathematics', '8', 'Expressions and Equations', 'Work with radicals and integer exponents', '8.EE.2', 'Use square root and cube root symbols to represent solutions to equations. Evaluate square roots of small perfect squares and cube roots of small perfect cubes.'),
  ('Mathematics', '8', 'Expressions and Equations', 'Work with radicals and integer exponents', '8.EE.3', 'Use numbers expressed in the form of a single digit times an integer power of 10 to estimate very large or very small quantities.'),
  ('Mathematics', '8', 'Expressions and Equations', 'Work with radicals and integer exponents', '8.EE.4', 'Perform operations with numbers expressed in scientific notation.'),
  ('Mathematics', '8', 'Expressions and Equations', 'Understand the connections between proportional relationships, lines, and linear equations', '8.EE.5', 'Graph proportional relationships, interpreting the unit rate as the slope of the graph.'),
  ('Mathematics', '8', 'Expressions and Equations', 'Understand the connections between proportional relationships, lines, and linear equations', '8.EE.6', 'Use similar triangles to explain why the slope m is the same between any two distinct points on a non-vertical line in the coordinate plane.'),
  ('Mathematics', '8', 'Expressions and Equations', 'Analyze and solve linear equations and pairs of simultaneous linear equations', '8.EE.7', 'Solve linear equations in one variable.'),
  ('Mathematics', '8', 'Expressions and Equations', 'Analyze and solve linear equations and pairs of simultaneous linear equations', '8.EE.7a', 'Give examples of linear equations in one variable with one solution, infinitely many solutions, or no solutions.'),
  ('Mathematics', '8', 'Expressions and Equations', 'Analyze and solve linear equations and pairs of simultaneous linear equations', '8.EE.7b', 'Solve linear equations with rational number coefficients.'),
  ('Mathematics', '8', 'Expressions and Equations', 'Analyze and solve linear equations and pairs of simultaneous linear equations', '8.EE.8', 'Analyze and solve pairs of simultaneous linear equations.'),
  ('Mathematics', '8', 'Expressions and Equations', 'Analyze and solve linear equations and pairs of simultaneous linear equations', '8.EE.8a', 'Understand that solutions to a system of two linear equations in two variables correspond to points of intersection of their graphs.'),
  ('Mathematics', '8', 'Expressions and Equations', 'Analyze and solve linear equations and pairs of simultaneous linear equations', '8.EE.8b', 'Solve systems of two linear equations in two variables algebraically.'),
  ('Mathematics', '8', 'Expressions and Equations', 'Analyze and solve linear equations and pairs of simultaneous linear equations', '8.EE.8c', 'Solve real-world and mathematical problems leading to two linear equations in two variables.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 8 - Functions
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '8', 'Functions', 'Define, evaluate, and compare functions', '8.F.1', 'Understand that a function is a rule that assigns to each input exactly one output.'),
  ('Mathematics', '8', 'Functions', 'Define, evaluate, and compare functions', '8.F.2', 'Compare properties of two functions each represented in a different way.'),
  ('Mathematics', '8', 'Functions', 'Define, evaluate, and compare functions', '8.F.3', 'Interpret the equation y = mx + b as defining a linear function, whose graph is a straight line.'),
  ('Mathematics', '8', 'Functions', 'Use functions to model relationships between quantities', '8.F.4', 'Construct a function to model a linear relationship between two quantities.'),
  ('Mathematics', '8', 'Functions', 'Use functions to model relationships between quantities', '8.F.5', 'Describe qualitatively the functional relationship between two quantities by analyzing a graph.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 8 - Geometry
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '8', 'Geometry', 'Understand congruence and similarity using physical models, transparencies, or geometry software', '8.G.1', 'Verify experimentally the properties of rotations, reflections, and translations.'),
  ('Mathematics', '8', 'Geometry', 'Understand congruence and similarity using physical models, transparencies, or geometry software', '8.G.1a', 'Lines are taken to lines, and line segments to line segments of the same length.'),
  ('Mathematics', '8', 'Geometry', 'Understand congruence and similarity using physical models, transparencies, or geometry software', '8.G.1b', 'Angles are taken to angles of the same measure.'),
  ('Mathematics', '8', 'Geometry', 'Understand congruence and similarity using physical models, transparencies, or geometry software', '8.G.1c', 'Parallel lines are taken to parallel lines.'),
  ('Mathematics', '8', 'Geometry', 'Understand congruence and similarity using physical models, transparencies, or geometry software', '8.G.2', 'Understand that a two-dimensional figure is congruent to another if the second can be obtained from the first by a sequence of rotations, reflections, and translations.'),
  ('Mathematics', '8', 'Geometry', 'Understand congruence and similarity using physical models, transparencies, or geometry software', '8.G.3', 'Describe the effect of dilations, translations, rotations, and reflections on two-dimensional figures using coordinates.'),
  ('Mathematics', '8', 'Geometry', 'Understand congruence and similarity using physical models, transparencies, or geometry software', '8.G.4', 'Understand that a two-dimensional figure is similar to another if the second can be obtained from the first by a sequence of rotations, reflections, translations, and dilations.'),
  ('Mathematics', '8', 'Geometry', 'Understand congruence and similarity using physical models, transparencies, or geometry software', '8.G.5', 'Use informal arguments to establish facts about the angle sum and exterior angle of triangles, about the angles created when parallel lines are cut by a transversal.'),
  ('Mathematics', '8', 'Geometry', 'Understand and apply the Pythagorean Theorem', '8.G.6', 'Explain a proof of the Pythagorean Theorem and its converse.'),
  ('Mathematics', '8', 'Geometry', 'Understand and apply the Pythagorean Theorem', '8.G.7', 'Apply the Pythagorean Theorem to determine unknown side lengths in right triangles in real-world and mathematical problems.'),
  ('Mathematics', '8', 'Geometry', 'Understand and apply the Pythagorean Theorem', '8.G.8', 'Apply the Pythagorean Theorem to find the distance between two points in a coordinate system.'),
  ('Mathematics', '8', 'Geometry', 'Solve real-world and mathematical problems involving volume of cylinders, cones, and spheres', '8.G.9', 'Know the formulas for the volumes of cones, cylinders, and spheres and use them to solve real-world and mathematical problems.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- Grade 8 - Statistics and Probability
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', '8', 'Statistics and Probability', 'Investigate patterns of association in bivariate data', '8.SP.1', 'Construct and interpret scatter plots for bivariate measurement data.'),
  ('Mathematics', '8', 'Statistics and Probability', 'Investigate patterns of association in bivariate data', '8.SP.2', 'Know that straight lines are widely used to model relationships between two quantitative variables.'),
  ('Mathematics', '8', 'Statistics and Probability', 'Investigate patterns of association in bivariate data', '8.SP.3', 'Use the equation of a linear model to solve problems in the context of bivariate measurement data.'),
  ('Mathematics', '8', 'Statistics and Probability', 'Investigate patterns of association in bivariate data', '8.SP.4', 'Understand that patterns of association can also be seen in bivariate categorical data by displaying frequencies and relative frequencies in a two-way table.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;
