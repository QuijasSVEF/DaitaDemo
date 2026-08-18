import React from 'react';
import { Clock, Target, Users, BookOpen, CheckCircle, GraduationCap, Brain, HelpCircle, List, Package, FileText, UserCheck, Settings, Calculator, AlertTriangle, ArrowLeft, Eye } from 'lucide-react';
import { LessonPlan, DetailedActivity } from '../../types';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { useQueryClient } from '@tanstack/react-query';
import { RegenerateButton } from '../analytics/RegenerateButton';
import { supabase } from '../../services/supabase/config';
import { RelatedProblems } from './RelatedProblems';
import { generateLessonPlan } from '../../services/lessonPlanService';

interface LessonPlanViewProps {
  lessonPlan: LessonPlan;
  onBack: () => void;
  onRegenerate?: () => void;
  isRegeneratingExternal?: boolean;
  lessonPlanId?: string;
  exitTicketId?: string;
  struggledAreas?: string[];
}

interface DOKBadgeProps {
  level: number;
  className?: string;
}

function DOKBadge({ level, className }: DOKBadgeProps) {
  const descriptions = {
    1: 'Recall and Reproduction',
    2: 'Skills and Concepts',
    3: 'Strategic Thinking',
    4: 'Extended Thinking'
  };

  return (
    <div 
      className={`group relative ${className || ''}`}
      title={`DOK Level ${level}: ${descriptions[level as keyof typeof descriptions]}`}
    >
      <span className="px-2 py-1 bg-svef-purple/10 text-xs rounded-full flex items-center space-x-1">
        <Brain className="w-3 h-3 text-svef-purple" />
        <span className="text-svef-purple">DOK {level}</span>
      </span>
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-black text-white text-xs rounded p-2 hidden group-hover:block">
        {descriptions[level as keyof typeof descriptions]}
      </div>
    </div>
  );
}

function ActivitySection({ activity, title }: { activity: DetailedActivity; title: string }) {
  if (!activity) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-500">Activity details not available</p>
      </div>
    );
  }

  // Resolve teacher scripts - prefer top-level array, fall back to extracting from steps
  const teacherScripts: string[] = (() => {
    if (activity.teacherScript && activity.teacherScript.length > 0) return activity.teacherScript;
    const fromSteps: string[] = [];
    if (Array.isArray(activity.steps)) {
      for (const step of activity.steps) {
        if (typeof step === 'object' && (step as any).teacherSays) {
          fromSteps.push((step as any).teacherSays);
        }
      }
    }
    return fromSteps;
  })();

  // Resolve student behaviors / look-fors
  const studentBehaviors: string[] = (() => {
    if (activity.expectedStudentBehaviors && activity.expectedStudentBehaviors.length > 0) return activity.expectedStudentBehaviors;
    if (activity.studentBehaviors && activity.studentBehaviors.length > 0) return activity.studentBehaviors;
    const fromSteps: string[] = [];
    if (Array.isArray(activity.steps)) {
      for (const step of activity.steps) {
        if (typeof step === 'object' && (step as any).lookFor) {
          fromSteps.push((step as any).lookFor);
        }
      }
    }
    return fromSteps;
  })();

  // Resolve differentiation
  const diff = activity.differentiation || {} as any;
  const struggling: string[] = Array.isArray(diff.struggling) && diff.struggling.length > 0
    ? diff.struggling
    : diff.ifStrugglingMore ? [diff.ifStrugglingMore] : [];
  const advanced: string[] = Array.isArray(diff.advanced) && diff.advanced.length > 0
    ? diff.advanced
    : diff.ifGettingIt ? [diff.ifGettingIt] : [];

  // Resolve common misconceptions
  const misconceptions = (activity.commonMisconceptions && activity.commonMisconceptions.length > 0)
    ? activity.commonMisconceptions
    : (activity.commonMistakes && activity.commonMistakes.length > 0)
      ? activity.commonMistakes
      : [];

  return (
    <div className="space-y-4 bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-svef-gray">{title}</h4>
        <span className="text-sm text-svef-purple">{activity.timeAllocation || 'Time not specified'}</span>
      </div>

      {activity.objective && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-blue-800 mb-2">Objective</h5>
          <p className="text-sm text-blue-700">{activity.objective}</p>
        </div>
      )}

      {activity.setup && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-gray-800 mb-2">Setup</h5>
          <p className="text-sm text-gray-700">{activity.setup}</p>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h5 className="text-sm font-medium text-svef-gray mb-2 flex items-center">
            <List className="w-4 h-4 mr-2" />
            Steps
          </h5>
          <div className="space-y-3">
            {(activity.steps || []).map((step, i) => {
              if (typeof step === 'string') {
                return (
                  <div key={i} className="border border-gray-200 rounded-lg p-3">
                    <p className="text-sm text-gray-700">{step}</p>
                  </div>
                );
              }

              const stepObj = step as any;
              return (
              <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h6 className="font-medium text-svef-purple">{stepObj.phase || `Step ${i + 1}`}</h6>
                  <span className="text-xs text-svef-gray">{stepObj.duration || ''}</span>
                </div>
                {stepObj.instruction && (
                  <div>
                    <p className="text-xs font-medium text-gray-600">Instruction:</p>
                    <p className="text-sm text-gray-700">{stepObj.instruction}</p>
                  </div>
                )}
                {stepObj.teacherSays && (
                  <div className="bg-amber-50 border-l-3 border-amber-400 pl-3 py-2 rounded-r">
                    <p className="text-xs font-medium text-amber-700 mb-0.5">Say:</p>
                    <p className="text-sm text-amber-900 italic">{stepObj.teacherSays}</p>
                  </div>
                )}
                {stepObj.lookFor && (
                  <div className="bg-teal-50 border-l-3 border-teal-400 pl-3 py-2 rounded-r">
                    <p className="text-xs font-medium text-teal-700 mb-0.5 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      Look for:
                    </p>
                    <p className="text-sm text-teal-800">{stepObj.lookFor}</p>
                  </div>
                )}
                {!stepObj.teacherSays && !stepObj.lookFor && stepObj.expectedResponse && (
                  <div>
                    <p className="text-xs font-medium text-gray-600">Expected Response:</p>
                    <p className="text-sm text-gray-700">{stepObj.expectedResponse}</p>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>

        {(activity.materials || []).length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-svef-gray mb-2 flex items-center">
            <Package className="w-4 h-4 mr-2" />
            Materials
          </h5>
          <ul className="list-disc list-inside space-y-1">
            {activity.materials.map((material, i) => (
              <li key={i} className="text-sm text-svef-gray">{material}</li>
            ))}
          </ul>
        </div>
        )}

        {teacherScripts.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-svef-gray mb-2 flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Teacher Script
          </h5>
          <div className="space-y-2">
            {teacherScripts.map((script, i) => (
              <div key={i} className="bg-amber-50 border-l-3 border-amber-400 pl-3 py-2 rounded-r">
                <p className="text-sm text-amber-900 italic">{script}</p>
              </div>
            ))}
          </div>
        </div>
        )}

        {studentBehaviors.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-svef-gray mb-2 flex items-center">
            <UserCheck className="w-4 h-4 mr-2" />
            What to Look For (Student Behaviors)
          </h5>
          <ul className="list-disc list-inside space-y-1">
            {studentBehaviors.map((behavior, i) => (
              <li key={i} className="text-sm text-svef-gray">{behavior}</li>
            ))}
          </ul>
        </div>
        )}

        {(struggling.length > 0 || advanced.length > 0) && (
        <div>
          <h5 className="text-sm font-medium text-svef-gray mb-2 flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Differentiation
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-orange-50 rounded-lg p-3">
              <h6 className="text-xs font-medium text-orange-800 mb-1">Struggling Students</h6>
              {struggling.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {struggling.map((strat, i) => (
                    <li key={i} className="text-xs text-orange-700">{strat}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-400 italic">Not specified</p>
              )}
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <h6 className="text-xs font-medium text-green-800 mb-1">Advanced Students</h6>
              {advanced.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {advanced.map((strat, i) => (
                    <li key={i} className="text-xs text-green-700">{strat}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-400 italic">Not specified</p>
              )}
            </div>
          </div>
        </div>
        )}

        {misconceptions.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-svef-gray mb-2 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Common Misconceptions to Watch
            </h5>
            <ul className="list-disc list-inside space-y-1">
              {misconceptions.map((misconception, i) => (
                <li key={i} className="text-sm text-red-600">{misconception}</li>
              ))}
            </ul>
          </div>
        )}

        {activity.quickAssessment && activity.quickAssessment.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-svef-gray mb-2 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              Quick Assessment
            </h5>
            <ul className="list-disc list-inside space-y-1">
              {activity.quickAssessment.map((assessment, i) => (
                <li key={i} className="text-sm text-green-600">{assessment}</li>
              ))}
            </ul>
          </div>
        )}

        {activity.successCriteria && activity.successCriteria.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-svef-gray mb-2 flex items-center">
              <Target className="w-4 h-4 mr-2" />
              Success Criteria
            </h5>
            <ul className="list-disc list-inside space-y-1">
              {activity.successCriteria.map((criteria, i) => (
                <li key={i} className="text-sm text-blue-600">{criteria}</li>
              ))}
            </ul>
          </div>
        )}

        {activity.standardsAlignment?.code && (
          <div>
            <h5 className="text-sm font-medium text-svef-gray mb-2">Standards Alignment</h5>
            <div className="bg-svef-beige/20 rounded-lg p-4">
              <p className="text-sm font-medium text-svef-purple mb-1">{activity.standardsAlignment.code}</p>
              <p className="text-sm text-svef-gray mb-2">{activity.standardsAlignment.description}</p>
              <div className="space-y-2">
                <div>
                  <h6 className="text-xs font-medium text-svef-gray">Activities</h6>
                  <ul className="list-disc list-inside">
                    {activity.standardsAlignment.activities.map((act, i) => (
                      <li key={i} className="text-xs text-svef-gray">{act}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h6 className="text-xs font-medium text-svef-gray">Assessment Methods</h6>
                  <ul className="list-disc list-inside">
                    {activity.standardsAlignment.assessmentMethods.map((method, i) => (
                      <li key={i} className="text-xs text-svef-gray">{method}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function LessonPlanView({ lessonPlan, onBack, onRegenerate, isRegeneratingExternal = false, lessonPlanId, exitTicketId, struggledAreas = [] }: LessonPlanViewProps) {
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'lesson' | 'problems'>('lesson');
  const queryClient = useQueryClient();
  const [currentLessonPlan, setCurrentLessonPlan] = React.useState<LessonPlan>(lessonPlan);

  const handleRegeneratePlan = async () => {
    // If an external regenerate handler is provided, use it
    if (onRegenerate) {
      onRegenerate();
      return;
    }

    if (!lessonPlanId || !exitTicketId) return;

    try {
      setIsRegenerating(true);
      console.log('Regenerating lesson plan:', lessonPlanId);

      // Get exit ticket data
      const { data: exitTicket, error: ticketError } = await supabase
        .from('exit_tickets')
        .select('student_id, teacher_username, last_lesson, struggled_areas')
        .eq('id', exitTicketId)
        .single();

      if (ticketError) throw ticketError;
      if (!exitTicket) throw new Error('Exit ticket not found');

      // Get student data for grade level
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('grade_level')
        .eq('id', exitTicket.student_id)
        .eq('teacher_username', exitTicket.teacher_username)
        .single();

      if (studentError) throw studentError;
      if (!student) throw new Error('Student not found');

      // Generate new lesson plan using OpenAI
      const newPlan = await generateLessonPlan(
        student.grade_level,
        exitTicket.last_lesson,
        exitTicket.struggled_areas,
        exitTicket.teacher_username,
        exitTicket.student_id,
        exitTicketId
      );

      if (!newPlan) throw new Error('Failed to generate lesson plan');

      // Update the lesson plan in the database
      const { error: updateError } = await supabase
        .from('lesson_plans')
        .update({
          objective: newPlan.objective,
          engagement: newPlan.engagement,
          representation: newPlan.representation,
          action_expression: newPlan.actionExpression,
          wrapup: newPlan.wrapup,
          duration: newPlan.duration,
          aligned_standards: newPlan.alignedStandards || [],
          dok_levels: newPlan.dokLevels,
          detailed_activities: newPlan.detailedActivities,
          em_reference: newPlan.emReference || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', lessonPlanId);

      if (updateError) throw updateError;

      console.log('Lesson plan regenerated successfully');

      // Update local state
      setCurrentLessonPlan(newPlan);

      // Invalidate all relevant queries to refresh data
      await Promise.all([
        queryClient.invalidateQueries(['teacherStudents']),
        queryClient.invalidateQueries(['teacherExitTickets']),
        queryClient.invalidateQueries(['teacherLessonPlans']),
        queryClient.invalidateQueries(['weeklyGroups']),
        queryClient.invalidateQueries(['classroomAnalytics'])
      ]);
    } catch (error) {
      console.error('Error regenerating lesson plan:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const defaultDOKLevels = {
    engagement: 1,
    representation: 2,
    action_expression: 3,
    wrapup: 2
  };

  const dokLevels = currentLessonPlan?.dokLevels || defaultDOKLevels;

  // Add default empty arrays for each section
  const engagement = currentLessonPlan?.engagement || [];
  const representation = currentLessonPlan?.representation || [];
  const actionExpression = currentLessonPlan?.actionExpression || [];
  const wrapup = currentLessonPlan?.wrapup || [];
  const detailedActivities = currentLessonPlan?.detailedActivities;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Lesson plan tabs">
            <button
              onClick={() => setActiveTab('lesson')}
              className={cn(
                "flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                activeTab === 'lesson'
                  ? "border-svef-purple text-svef-purple"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <BookOpen className="w-4 h-4" />
              <span>Lesson Plan</span>
            </button>
            <button
              onClick={() => setActiveTab('problems')}
              className={cn(
                "flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                activeTab === 'problems'
                  ? "border-svef-purple text-svef-purple"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <Calculator className="w-4 h-4" />
              <span>Practice Problems</span>
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'lesson' && (
        <>
      {currentLessonPlan?.emReference && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5">
          <div className="flex items-start space-x-3">
            <GraduationCap className="w-5 h-5 text-emerald-700 mt-0.5" />
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                Elevate Math Curriculum Reference
              </div>
              <div className="mt-1 font-oswald text-lg text-emerald-900">
                {currentLessonPlan.emReference}
              </div>
              <p className="mt-2 text-sm text-emerald-800">
                Open this section in your Elevate Math binder. Every activity below cites it so
                new teachers can follow along step by step.
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-sm p-6 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Target className="w-6 h-6 text-svef-purple" />
            <h3 className="font-oswald text-xl font-medium text-svef-gray">Objective</h3>
          </div>
          <div className="flex items-center space-x-2">
            {(lessonPlanId || onRegenerate) && (
              <RegenerateButton
                onClick={onRegenerate || handleRegeneratePlan}
                isLoading={isRegeneratingExternal || isRegenerating}
              />
            )}
          </div>
        </div>
        <p className="font-roboto text-svef-gray">{currentLessonPlan?.objective || 'No objective specified'}</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Users className="w-6 h-6 text-svef-purple" />
              <h3 className="font-oswald text-xl font-medium text-svef-gray">Engagement</h3>
              <DOKBadge level={dokLevels.engagement} />
            </div>
          </div>
          <div className="space-y-6">
            <ul className="list-disc list-inside space-y-2">
              {engagement.map((item, i) => <li key={i} className="text-sm text-svef-gray">{item}</li>)}
            </ul>
            {detailedActivities?.engagement?.map((activity, index) => (
              <ActivitySection 
                key={`engagement-${index}`}
                activity={activity}
                title={`Activity ${index + 1}: ${activity.description}`}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <BookOpen className="w-6 h-6 text-svef-purple" />
            <h3 className="font-oswald text-xl font-medium text-svef-gray">Representation</h3>
            <DOKBadge level={dokLevels.representation} />
          </div>
          <div className="space-y-6">
            <ul className="list-disc list-inside space-y-2">
              {representation.map((item, i) => <li key={i} className="text-sm text-svef-gray">{item}</li>)}
            </ul>
            {detailedActivities?.representation?.map((activity, index) => (
              <ActivitySection 
                key={`representation-${index}`}
                activity={activity}
                title={`Activity ${index + 1}: ${activity.description}`}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="w-6 h-6 text-svef-purple" />
            <h3 className="font-oswald text-xl font-medium text-svef-gray">Action & Expression</h3>
            <DOKBadge level={dokLevels.action_expression} />
          </div>
          <div className="space-y-6">
            <ul className="list-disc list-inside space-y-2">
              {actionExpression.map((item, i) => <li key={i} className="text-sm text-svef-gray">{item}</li>)}
            </ul>
            {detailedActivities?.actionExpression?.map((activity, index) => (
              <ActivitySection 
                key={`action-${index}`}
                activity={activity}
                title={`Activity ${index + 1}: ${activity.description}`}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="w-6 h-6 text-svef-purple" />
            <h3 className="font-oswald text-xl font-medium text-svef-gray">Wrap-up</h3>
            <DOKBadge level={dokLevels.wrapup} />
          </div>
          <div className="space-y-6">
            <ul className="list-disc list-inside space-y-2">
              {wrapup.map((item, i) => <li key={i} className="text-sm text-svef-gray">{item}</li>)}
            </ul>
            {detailedActivities?.wrapup?.map((activity, index) => (
              <ActivitySection 
                key={`wrapup-${index}`}
                activity={activity}
                title={`Activity ${index + 1}: ${activity.description}`}
              />
            ))}
          </div>
        </div>
      </div>
        </>
      )}

      {activeTab === 'problems' && (
        <RelatedProblems 
          struggledAreas={struggledAreas}
          gradeLevel={currentLessonPlan?.gradeLevel || '6'}
          studentId={lessonPlanId ? undefined : undefined}
          teacherUsername={lessonPlanId ? undefined : undefined}
        />
      )}

      <div className="flex justify-end space-x-4">
        <Button variant="secondary" onClick={onBack}>
          Create Another Plan
        </Button>
        <Button 
          onClick={() => window.print()}
          disabled={isRegenerating}
        >
          Print Lesson Plan
        </Button>
      </div>
    </div>
  );
}