/*
  # Populate California Math Standards - High School

  ## Purpose
  Completes the comprehensive population of California Common Core Math Standards
  for the high school level.
  
  ## Changes
  - Adds all missing High School standards across all conceptual categories:
    Number and Quantity, Algebra, Functions, Geometry, Statistics and Probability
  
  ## Tables Modified
  - `ca_standards` - INSERT only
*/

-- HS Number and Quantity - The Real Number System
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'HS', 'Number and Quantity', 'Extend the properties of exponents to rational exponents', 'HSN.RN.1', 'Explain how the definition of the meaning of rational exponents follows from extending the properties of integer exponents.'),
  ('Mathematics', 'HS', 'Number and Quantity', 'Extend the properties of exponents to rational exponents', 'HSN.RN.2', 'Rewrite expressions involving radicals and rational exponents using the properties of exponents.'),
  ('Mathematics', 'HS', 'Number and Quantity', 'Use properties of rational and irrational numbers', 'HSN.RN.3', 'Explain why the sum or product of two rational numbers is rational; that the sum of a rational number and an irrational number is irrational.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- HS Number and Quantity - Quantities
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'HS', 'Number and Quantity', 'Reason quantitatively and use units to solve problems', 'HSN.Q.1', 'Use units as a way to understand problems and to guide the solution of multi-step problems.'),
  ('Mathematics', 'HS', 'Number and Quantity', 'Reason quantitatively and use units to solve problems', 'HSN.Q.2', 'Define appropriate quantities for the purpose of descriptive modeling.'),
  ('Mathematics', 'HS', 'Number and Quantity', 'Reason quantitatively and use units to solve problems', 'HSN.Q.3', 'Choose a level of accuracy appropriate to limitations on measurement when reporting quantities.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- HS Number and Quantity - The Complex Number System
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'HS', 'Number and Quantity', 'Perform arithmetic operations with complex numbers', 'HSN.CN.1', 'Know there is a complex number i such that i^2 = -1, and every complex number has the form a + bi with a and b real.'),
  ('Mathematics', 'HS', 'Number and Quantity', 'Perform arithmetic operations with complex numbers', 'HSN.CN.2', 'Use the relation i^2 = -1 and the commutative, associative, and distributive properties to add, subtract, and multiply complex numbers.'),
  ('Mathematics', 'HS', 'Number and Quantity', 'Perform arithmetic operations with complex numbers', 'HSN.CN.3', 'Find the conjugate of a complex number; use conjugates to find moduli and quotients of complex numbers.'),
  ('Mathematics', 'HS', 'Number and Quantity', 'Use complex numbers in polynomial identities and equations', 'HSN.CN.7', 'Solve quadratic equations with real coefficients that have complex solutions.'),
  ('Mathematics', 'HS', 'Number and Quantity', 'Use complex numbers in polynomial identities and equations', 'HSN.CN.8', 'Extend polynomial identities to the complex numbers.'),
  ('Mathematics', 'HS', 'Number and Quantity', 'Use complex numbers in polynomial identities and equations', 'HSN.CN.9', 'Know the Fundamental Theorem of Algebra; show that it is true for quadratic polynomials.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- HS Algebra - Seeing Structure in Expressions
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'HS', 'Algebra', 'Interpret the structure of expressions', 'HSA.SSE.1', 'Interpret expressions that represent a quantity in terms of its context.'),
  ('Mathematics', 'HS', 'Algebra', 'Interpret the structure of expressions', 'HSA.SSE.1a', 'Interpret parts of an expression, such as terms, factors, and coefficients.'),
  ('Mathematics', 'HS', 'Algebra', 'Interpret the structure of expressions', 'HSA.SSE.1b', 'Interpret complicated expressions by viewing one or more of their parts as a single entity.'),
  ('Mathematics', 'HS', 'Algebra', 'Interpret the structure of expressions', 'HSA.SSE.2', 'Use the structure of an expression to identify ways to rewrite it.'),
  ('Mathematics', 'HS', 'Algebra', 'Write expressions in equivalent forms to solve problems', 'HSA.SSE.3', 'Choose and produce an equivalent form of an expression to reveal and explain properties of the quantity represented.'),
  ('Mathematics', 'HS', 'Algebra', 'Write expressions in equivalent forms to solve problems', 'HSA.SSE.3a', 'Factor a quadratic expression to reveal the zeros of the function it defines.'),
  ('Mathematics', 'HS', 'Algebra', 'Write expressions in equivalent forms to solve problems', 'HSA.SSE.3b', 'Complete the square in a quadratic expression to reveal the maximum or minimum value of the function it defines.'),
  ('Mathematics', 'HS', 'Algebra', 'Write expressions in equivalent forms to solve problems', 'HSA.SSE.3c', 'Use the properties of exponents to transform expressions for exponential functions.'),
  ('Mathematics', 'HS', 'Algebra', 'Write expressions in equivalent forms to solve problems', 'HSA.SSE.4', 'Derive the formula for the sum of a finite geometric series, and use the formula to solve problems.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- HS Algebra - Arithmetic with Polynomials and Rational Expressions
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'HS', 'Algebra', 'Perform arithmetic operations on polynomials', 'HSA.APR.1', 'Understand that polynomials form a system analogous to the integers, namely, they are closed under the operations of addition, subtraction, and multiplication.'),
  ('Mathematics', 'HS', 'Algebra', 'Understand the relationship between zeros and factors of polynomials', 'HSA.APR.2', 'Know and apply the Remainder Theorem.'),
  ('Mathematics', 'HS', 'Algebra', 'Understand the relationship between zeros and factors of polynomials', 'HSA.APR.3', 'Identify zeros of polynomials when suitable factorizations are available.'),
  ('Mathematics', 'HS', 'Algebra', 'Use polynomial identities to solve problems', 'HSA.APR.4', 'Prove polynomial identities and use them to describe numerical relationships.'),
  ('Mathematics', 'HS', 'Algebra', 'Use polynomial identities to solve problems', 'HSA.APR.5', 'Know and apply the Binomial Theorem for the expansion of (x + y)^n.'),
  ('Mathematics', 'HS', 'Algebra', 'Rewrite rational expressions', 'HSA.APR.6', 'Rewrite simple rational expressions in different forms.'),
  ('Mathematics', 'HS', 'Algebra', 'Rewrite rational expressions', 'HSA.APR.7', 'Understand that rational expressions form a system analogous to the rational numbers, closed under addition, subtraction, multiplication, and division by a nonzero rational expression.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- HS Algebra - Creating Equations
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'HS', 'Algebra', 'Create equations that describe numbers or relationships', 'HSA.CED.1', 'Create equations and inequalities in one variable and use them to solve problems.'),
  ('Mathematics', 'HS', 'Algebra', 'Create equations that describe numbers or relationships', 'HSA.CED.2', 'Create equations in two or more variables to represent relationships between quantities.'),
  ('Mathematics', 'HS', 'Algebra', 'Create equations that describe numbers or relationships', 'HSA.CED.3', 'Represent constraints by equations or inequalities, and by systems of equations and/or inequalities.'),
  ('Mathematics', 'HS', 'Algebra', 'Create equations that describe numbers or relationships', 'HSA.CED.4', 'Rearrange formulas to highlight a quantity of interest, using the same reasoning as in solving equations.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- HS Algebra - Reasoning with Equations and Inequalities
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'HS', 'Algebra', 'Understand solving equations as a process of reasoning and explain the reasoning', 'HSA.REI.1', 'Explain each step in solving a simple equation as following from the equality of numbers asserted at the previous step.'),
  ('Mathematics', 'HS', 'Algebra', 'Understand solving equations as a process of reasoning and explain the reasoning', 'HSA.REI.2', 'Solve simple rational and radical equations in one variable, and give examples showing how extraneous solutions may arise.'),
  ('Mathematics', 'HS', 'Algebra', 'Solve equations and inequalities in one variable', 'HSA.REI.3', 'Solve linear equations and inequalities in one variable, including equations with coefficients represented by letters.'),
  ('Mathematics', 'HS', 'Algebra', 'Solve equations and inequalities in one variable', 'HSA.REI.4', 'Solve quadratic equations in one variable.'),
  ('Mathematics', 'HS', 'Algebra', 'Solve equations and inequalities in one variable', 'HSA.REI.4a', 'Use the method of completing the square to transform any quadratic equation in x into an equation of the form (x - p)^2 = q.'),
  ('Mathematics', 'HS', 'Algebra', 'Solve equations and inequalities in one variable', 'HSA.REI.4b', 'Solve quadratic equations by inspection, taking square roots, completing the square, the quadratic formula and factoring.'),
  ('Mathematics', 'HS', 'Algebra', 'Solve systems of equations', 'HSA.REI.5', 'Prove that, given a system of two equations in two variables, replacing one equation by the sum of that equation and a multiple of the other produces a system with the same solutions.'),
  ('Mathematics', 'HS', 'Algebra', 'Solve systems of equations', 'HSA.REI.6', 'Solve systems of linear equations exactly and approximately.'),
  ('Mathematics', 'HS', 'Algebra', 'Solve systems of equations', 'HSA.REI.7', 'Solve a simple system consisting of a linear equation and a quadratic equation in two variables algebraically and graphically.'),
  ('Mathematics', 'HS', 'Algebra', 'Represent and solve equations and inequalities graphically', 'HSA.REI.10', 'Understand that the graph of an equation in two variables is the set of all its solutions plotted in the coordinate plane.'),
  ('Mathematics', 'HS', 'Algebra', 'Represent and solve equations and inequalities graphically', 'HSA.REI.11', 'Explain why the x-coordinates of the points where the graphs of the equations y = f(x) and y = g(x) intersect are the solutions of the equation f(x) = g(x).'),
  ('Mathematics', 'HS', 'Algebra', 'Represent and solve equations and inequalities graphically', 'HSA.REI.12', 'Graph the solutions to a linear inequality in two variables as a half-plane.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- HS Functions - Interpreting Functions
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'HS', 'Functions', 'Understand the concept of a function and use function notation', 'HSF.IF.1', 'Understand that a function from one set (called the domain) to another set (called the range) assigns to each element of the domain exactly one element of the range.'),
  ('Mathematics', 'HS', 'Functions', 'Understand the concept of a function and use function notation', 'HSF.IF.2', 'Use function notation, evaluate functions for inputs in their domains, and interpret statements that use function notation in terms of a context.'),
  ('Mathematics', 'HS', 'Functions', 'Understand the concept of a function and use function notation', 'HSF.IF.3', 'Recognize that sequences are functions, sometimes defined recursively, whose domain is a subset of the integers.'),
  ('Mathematics', 'HS', 'Functions', 'Interpret functions that arise in applications in terms of the context', 'HSF.IF.4', 'For a function that models a relationship between two quantities, interpret key features of graphs and tables in terms of the quantities.'),
  ('Mathematics', 'HS', 'Functions', 'Interpret functions that arise in applications in terms of the context', 'HSF.IF.5', 'Relate the domain of a function to its graph and, where applicable, to the quantitative relationship it describes.'),
  ('Mathematics', 'HS', 'Functions', 'Interpret functions that arise in applications in terms of the context', 'HSF.IF.6', 'Calculate and interpret the average rate of change of a function over a specified interval.'),
  ('Mathematics', 'HS', 'Functions', 'Analyze functions using different representations', 'HSF.IF.7', 'Graph functions expressed symbolically and show key features of the graph.'),
  ('Mathematics', 'HS', 'Functions', 'Analyze functions using different representations', 'HSF.IF.7a', 'Graph linear and quadratic functions and show intercepts, maxima, and minima.'),
  ('Mathematics', 'HS', 'Functions', 'Analyze functions using different representations', 'HSF.IF.7b', 'Graph square root, cube root, and piecewise-defined functions, including step functions and absolute value functions.'),
  ('Mathematics', 'HS', 'Functions', 'Analyze functions using different representations', 'HSF.IF.7c', 'Graph polynomial functions, identifying zeros when suitable factorizations are available, and showing end behavior.'),
  ('Mathematics', 'HS', 'Functions', 'Analyze functions using different representations', 'HSF.IF.7e', 'Graph exponential and logarithmic functions, showing intercepts and end behavior.'),
  ('Mathematics', 'HS', 'Functions', 'Analyze functions using different representations', 'HSF.IF.8', 'Write a function defined by an expression in different but equivalent forms to reveal and explain different properties of the function.'),
  ('Mathematics', 'HS', 'Functions', 'Analyze functions using different representations', 'HSF.IF.8a', 'Use the process of factoring and completing the square in a quadratic function to show zeros, extreme values, and symmetry of the graph.'),
  ('Mathematics', 'HS', 'Functions', 'Analyze functions using different representations', 'HSF.IF.8b', 'Use the properties of exponents to interpret expressions for exponential functions.'),
  ('Mathematics', 'HS', 'Functions', 'Analyze functions using different representations', 'HSF.IF.9', 'Compare properties of two functions each represented in a different way.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- HS Functions - Building Functions
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'HS', 'Functions', 'Build a function that models a relationship between two quantities', 'HSF.BF.1', 'Write a function that describes a relationship between two quantities.'),
  ('Mathematics', 'HS', 'Functions', 'Build a function that models a relationship between two quantities', 'HSF.BF.1a', 'Determine an explicit expression, a recursive process, or steps for calculation from a context.'),
  ('Mathematics', 'HS', 'Functions', 'Build a function that models a relationship between two quantities', 'HSF.BF.1b', 'Combine standard function types using arithmetic operations.'),
  ('Mathematics', 'HS', 'Functions', 'Build a function that models a relationship between two quantities', 'HSF.BF.2', 'Write arithmetic and geometric sequences both recursively and with an explicit formula, use them to model situations.'),
  ('Mathematics', 'HS', 'Functions', 'Build new functions from existing functions', 'HSF.BF.3', 'Identify the effect on the graph of replacing f(x) by f(x) + k, k f(x), f(kx), and f(x + k).'),
  ('Mathematics', 'HS', 'Functions', 'Build new functions from existing functions', 'HSF.BF.4', 'Find inverse functions.'),
  ('Mathematics', 'HS', 'Functions', 'Build new functions from existing functions', 'HSF.BF.4a', 'Solve an equation of the form f(x) = c for a simple function f that has an inverse.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- HS Functions - Linear, Quadratic, and Exponential Models
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'HS', 'Functions', 'Construct and compare linear, quadratic, and exponential models and solve problems', 'HSF.LE.1', 'Distinguish between situations that can be modeled with linear functions and with exponential functions.'),
  ('Mathematics', 'HS', 'Functions', 'Construct and compare linear, quadratic, and exponential models and solve problems', 'HSF.LE.1a', 'Prove that linear functions grow by equal differences over equal intervals, and that exponential functions grow by equal factors over equal intervals.'),
  ('Mathematics', 'HS', 'Functions', 'Construct and compare linear, quadratic, and exponential models and solve problems', 'HSF.LE.1b', 'Recognize situations in which one quantity changes at a constant rate per unit interval relative to another.'),
  ('Mathematics', 'HS', 'Functions', 'Construct and compare linear, quadratic, and exponential models and solve problems', 'HSF.LE.1c', 'Recognize situations in which a quantity grows or decays by a constant percent rate per unit interval relative to another.'),
  ('Mathematics', 'HS', 'Functions', 'Construct and compare linear, quadratic, and exponential models and solve problems', 'HSF.LE.2', 'Construct linear and exponential functions, including arithmetic and geometric sequences, given a graph, a description of a relationship, or two input-output pairs.'),
  ('Mathematics', 'HS', 'Functions', 'Construct and compare linear, quadratic, and exponential models and solve problems', 'HSF.LE.3', 'Observe using graphs and tables that a quantity increasing exponentially eventually exceeds a quantity increasing linearly, quadratically, or as any polynomial function.'),
  ('Mathematics', 'HS', 'Functions', 'Interpret expressions for functions in terms of the situation they model', 'HSF.LE.5', 'Interpret the parameters in a linear or exponential function in terms of a context.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- HS Functions - Trigonometric Functions
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'HS', 'Functions', 'Extend the domain of trigonometric functions using the unit circle', 'HSF.TF.1', 'Understand radian measure of an angle as the length of the arc on the unit circle subtended by the angle.'),
  ('Mathematics', 'HS', 'Functions', 'Extend the domain of trigonometric functions using the unit circle', 'HSF.TF.2', 'Explain how the unit circle in the coordinate plane enables the extension of trigonometric functions to all real numbers.'),
  ('Mathematics', 'HS', 'Functions', 'Model periodic phenomena with trigonometric functions', 'HSF.TF.5', 'Choose trigonometric functions to model periodic phenomena with specified amplitude, frequency, and midline.'),
  ('Mathematics', 'HS', 'Functions', 'Prove and apply trigonometric identities', 'HSF.TF.8', 'Prove the Pythagorean identity sin^2(x) + cos^2(x) = 1 and use it to find sin(x), cos(x), or tan(x) given sin(x), cos(x), or tan(x) and the quadrant of the angle.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- HS Geometry - Congruence
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'HS', 'Geometry', 'Experiment with transformations in the plane', 'HSG.CO.1', 'Know precise definitions of angle, circle, perpendicular line, parallel line, and line segment.'),
  ('Mathematics', 'HS', 'Geometry', 'Experiment with transformations in the plane', 'HSG.CO.2', 'Represent transformations in the plane using transparencies and geometry software.'),
  ('Mathematics', 'HS', 'Geometry', 'Experiment with transformations in the plane', 'HSG.CO.3', 'Given a rectangle, parallelogram, trapezoid, or regular polygon, describe the rotations and reflections that carry it onto itself.'),
  ('Mathematics', 'HS', 'Geometry', 'Experiment with transformations in the plane', 'HSG.CO.4', 'Develop definitions of rotations, reflections, and translations in terms of angles, circles, perpendicular lines, parallel lines, and line segments.'),
  ('Mathematics', 'HS', 'Geometry', 'Experiment with transformations in the plane', 'HSG.CO.5', 'Given a geometric figure and a rotation, reflection, or translation, draw the transformed figure.'),
  ('Mathematics', 'HS', 'Geometry', 'Understand congruence in terms of rigid motions', 'HSG.CO.6', 'Use geometric descriptions of rigid motions to transform figures and to predict the effect of a given rigid motion on a given figure.'),
  ('Mathematics', 'HS', 'Geometry', 'Understand congruence in terms of rigid motions', 'HSG.CO.7', 'Use the definition of congruence in terms of rigid motions to show that two triangles are congruent.'),
  ('Mathematics', 'HS', 'Geometry', 'Understand congruence in terms of rigid motions', 'HSG.CO.8', 'Explain how the criteria for triangle congruence (ASA, SAS, and SSS) follow from the definition of congruence.'),
  ('Mathematics', 'HS', 'Geometry', 'Prove geometric theorems', 'HSG.CO.9', 'Prove theorems about lines and angles.'),
  ('Mathematics', 'HS', 'Geometry', 'Prove geometric theorems', 'HSG.CO.10', 'Prove theorems about triangles.'),
  ('Mathematics', 'HS', 'Geometry', 'Prove geometric theorems', 'HSG.CO.11', 'Prove theorems about parallelograms.'),
  ('Mathematics', 'HS', 'Geometry', 'Make geometric constructions', 'HSG.CO.12', 'Make formal geometric constructions with a variety of tools and methods.'),
  ('Mathematics', 'HS', 'Geometry', 'Make geometric constructions', 'HSG.CO.13', 'Construct an equilateral triangle, a square, and a regular hexagon inscribed in a circle.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- HS Geometry - Similarity, Right Triangles, and Trigonometry
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'HS', 'Geometry', 'Understand similarity in terms of similarity transformations', 'HSG.SRT.1', 'Verify experimentally the properties of dilations given by a center and a scale factor.'),
  ('Mathematics', 'HS', 'Geometry', 'Understand similarity in terms of similarity transformations', 'HSG.SRT.2', 'Given two figures, use the definition of similarity in terms of similarity transformations to decide if they are similar.'),
  ('Mathematics', 'HS', 'Geometry', 'Understand similarity in terms of similarity transformations', 'HSG.SRT.3', 'Use the properties of similarity transformations to establish the AA criterion for two triangles to be similar.'),
  ('Mathematics', 'HS', 'Geometry', 'Prove theorems involving similarity', 'HSG.SRT.4', 'Prove theorems about triangles.'),
  ('Mathematics', 'HS', 'Geometry', 'Prove theorems involving similarity', 'HSG.SRT.5', 'Use congruence and similarity criteria for triangles to solve problems and to prove relationships in geometric figures.'),
  ('Mathematics', 'HS', 'Geometry', 'Define trigonometric ratios and solve problems involving right triangles', 'HSG.SRT.6', 'Understand that by similarity, side ratios in right triangles are properties of the angles in the triangle.'),
  ('Mathematics', 'HS', 'Geometry', 'Define trigonometric ratios and solve problems involving right triangles', 'HSG.SRT.7', 'Explain and use the relationship between the sine and cosine of complementary angles.'),
  ('Mathematics', 'HS', 'Geometry', 'Define trigonometric ratios and solve problems involving right triangles', 'HSG.SRT.8', 'Use trigonometric ratios and the Pythagorean Theorem to solve right triangles in applied problems.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- HS Geometry - Circles
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'HS', 'Geometry', 'Understand and apply theorems about circles', 'HSG.C.1', 'Prove that all circles are similar.'),
  ('Mathematics', 'HS', 'Geometry', 'Understand and apply theorems about circles', 'HSG.C.2', 'Identify and describe relationships among inscribed angles, radii, and chords.'),
  ('Mathematics', 'HS', 'Geometry', 'Understand and apply theorems about circles', 'HSG.C.3', 'Construct the inscribed and circumscribed circles of a triangle.'),
  ('Mathematics', 'HS', 'Geometry', 'Find arc lengths and areas of sectors of circles', 'HSG.C.5', 'Derive using similarity the fact that the length of the arc intercepted by an angle is proportional to the radius.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- HS Geometry - Expressing Geometric Properties with Equations
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'HS', 'Geometry', 'Translate between the geometric description and the equation for a conic section', 'HSG.GPE.1', 'Derive the equation of a circle of given center and radius using the Pythagorean Theorem.'),
  ('Mathematics', 'HS', 'Geometry', 'Translate between the geometric description and the equation for a conic section', 'HSG.GPE.2', 'Derive the equation of a parabola given a focus and directrix.'),
  ('Mathematics', 'HS', 'Geometry', 'Use coordinates to prove simple geometric theorems algebraically', 'HSG.GPE.4', 'Use coordinates to prove simple geometric theorems algebraically.'),
  ('Mathematics', 'HS', 'Geometry', 'Use coordinates to prove simple geometric theorems algebraically', 'HSG.GPE.5', 'Prove the slope criteria for parallel and perpendicular lines and use them to solve geometric problems.'),
  ('Mathematics', 'HS', 'Geometry', 'Use coordinates to prove simple geometric theorems algebraically', 'HSG.GPE.6', 'Find the point on a directed line segment between two given points that partitions the segment in a given ratio.'),
  ('Mathematics', 'HS', 'Geometry', 'Use coordinates to prove simple geometric theorems algebraically', 'HSG.GPE.7', 'Use coordinates to compute perimeters of polygons and areas of triangles and rectangles.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- HS Geometry - Geometric Measurement and Dimension
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'HS', 'Geometry', 'Explain volume formulas and use them to solve problems', 'HSG.GMD.1', 'Give an informal argument for the formulas for the circumference of a circle, area of a circle, volume of a cylinder, pyramid, and cone.'),
  ('Mathematics', 'HS', 'Geometry', 'Explain volume formulas and use them to solve problems', 'HSG.GMD.3', 'Use volume formulas for cylinders, pyramids, cones, and spheres to solve problems.'),
  ('Mathematics', 'HS', 'Geometry', 'Visualize relationships between two-dimensional and three-dimensional objects', 'HSG.GMD.4', 'Identify the shapes of two-dimensional cross-sections of three-dimensional objects.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- HS Geometry - Modeling with Geometry
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'HS', 'Geometry', 'Apply geometric concepts in modeling situations', 'HSG.MG.1', 'Use geometric shapes, their measures, and their properties to describe objects.'),
  ('Mathematics', 'HS', 'Geometry', 'Apply geometric concepts in modeling situations', 'HSG.MG.2', 'Apply concepts of density based on area and volume in modeling situations.'),
  ('Mathematics', 'HS', 'Geometry', 'Apply geometric concepts in modeling situations', 'HSG.MG.3', 'Apply geometric methods to solve design problems.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- HS Statistics and Probability - Interpreting Categorical and Quantitative Data
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'HS', 'Statistics and Probability', 'Summarize, represent, and interpret data on a single count or measurement variable', 'HSS.ID.1', 'Represent data with plots on the real number line (dot plots, histograms, and box plots).'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Summarize, represent, and interpret data on a single count or measurement variable', 'HSS.ID.2', 'Use statistics appropriate to the shape of the data distribution to compare center (median, mean) and spread (interquartile range, standard deviation) of two or more different data sets.'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Summarize, represent, and interpret data on a single count or measurement variable', 'HSS.ID.3', 'Interpret differences in shape, center, and spread in the context of the data sets, accounting for possible effects of extreme data points (outliers).'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Summarize, represent, and interpret data on two categorical and quantitative variables', 'HSS.ID.5', 'Summarize categorical data for two categories in two-way frequency tables.'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Summarize, represent, and interpret data on two categorical and quantitative variables', 'HSS.ID.6', 'Represent data on two quantitative variables on a scatter plot, and describe how the variables are related.'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Summarize, represent, and interpret data on two categorical and quantitative variables', 'HSS.ID.6a', 'Fit a function to the data; use functions fitted to data to solve problems in the context of the data.'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Summarize, represent, and interpret data on two categorical and quantitative variables', 'HSS.ID.6b', 'Informally assess the fit of a function by plotting and analyzing residuals.'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Summarize, represent, and interpret data on two categorical and quantitative variables', 'HSS.ID.6c', 'Fit a linear function for a scatter plot that suggests a linear association.'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Interpret linear models', 'HSS.ID.7', 'Interpret the slope (rate of change) and the intercept (constant term) of a linear model in the context of the data.'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Interpret linear models', 'HSS.ID.8', 'Compute (using technology) and interpret the correlation coefficient of a linear fit.'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Interpret linear models', 'HSS.ID.9', 'Distinguish between correlation and causation.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- HS Statistics and Probability - Making Inferences and Justifying Conclusions
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'HS', 'Statistics and Probability', 'Understand and evaluate random processes underlying statistical experiments', 'HSS.IC.1', 'Understand statistics as a process for making inferences about population parameters based on a random sample from that population.'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Understand and evaluate random processes underlying statistical experiments', 'HSS.IC.2', 'Decide if a specified model is consistent with results from a given data-generating process.'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Make inferences and justify conclusions from sample surveys, experiments, and observational studies', 'HSS.IC.3', 'Recognize the purposes of and differences among sample surveys, experiments, and observational studies.'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Make inferences and justify conclusions from sample surveys, experiments, and observational studies', 'HSS.IC.4', 'Use data from a sample survey to estimate a population mean or proportion.'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Make inferences and justify conclusions from sample surveys, experiments, and observational studies', 'HSS.IC.5', 'Use data from a randomized experiment to compare two treatments.'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Make inferences and justify conclusions from sample surveys, experiments, and observational studies', 'HSS.IC.6', 'Evaluate reports based on data.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- HS Statistics and Probability - Conditional Probability and the Rules of Probability
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'HS', 'Statistics and Probability', 'Understand independence and conditional probability and use them to interpret data', 'HSS.CP.1', 'Describe events as subsets of a sample space using characteristics of the outcomes.'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Understand independence and conditional probability and use them to interpret data', 'HSS.CP.2', 'Understand that two events A and B are independent if the probability of A and B occurring together is the product of their probabilities.'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Understand independence and conditional probability and use them to interpret data', 'HSS.CP.3', 'Understand the conditional probability of A given B as P(A and B)/P(B).'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Understand independence and conditional probability and use them to interpret data', 'HSS.CP.4', 'Construct and interpret two-way frequency tables of data when two categories are associated with each object being classified.'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Understand independence and conditional probability and use them to interpret data', 'HSS.CP.5', 'Recognize and explain the concepts of conditional probability and independence in everyday language and everyday situations.'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Use the rules of probability to compute probabilities of compound events', 'HSS.CP.6', 'Find the conditional probability of A given B as the fraction of B''s outcomes that also belong to A.'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Use the rules of probability to compute probabilities of compound events', 'HSS.CP.7', 'Apply the Addition Rule, P(A or B) = P(A) + P(B) - P(A and B).'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Use the rules of probability to compute probabilities of compound events', 'HSS.CP.8', 'Apply the general Multiplication Rule in a uniform probability model, P(A and B) = P(A)P(B|A).'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Use the rules of probability to compute probabilities of compound events', 'HSS.CP.9', 'Use permutations and combinations to compute probabilities of compound events and solve problems.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;

-- HS Statistics and Probability - Using Probability to Make Decisions
INSERT INTO ca_standards (subject, grade_level, domain, cluster, standard_code, description)
VALUES
  ('Mathematics', 'HS', 'Statistics and Probability', 'Calculate expected values and use them to solve problems', 'HSS.MD.1', 'Define a random variable for a quantity of interest by assigning a numerical value to each event in a sample space.'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Calculate expected values and use them to solve problems', 'HSS.MD.2', 'Calculate the expected value of a random variable; interpret it as the mean of the probability distribution.'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Calculate expected values and use them to solve problems', 'HSS.MD.3', 'Develop a probability distribution for a random variable defined for a sample space.'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Use probability to evaluate outcomes of decisions', 'HSS.MD.6', 'Use probabilities to make fair decisions.'),
  ('Mathematics', 'HS', 'Statistics and Probability', 'Use probability to evaluate outcomes of decisions', 'HSS.MD.7', 'Analyze decisions and strategies using probability concepts.')
ON CONFLICT (subject, grade_level, standard_code) DO NOTHING;
