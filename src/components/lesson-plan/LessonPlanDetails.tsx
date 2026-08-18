import React from 'react';
import { Clock, Target, Users, BookOpen, CheckCircle, ArrowLeft } from 'lucide-react';
import { LessonPlan, ExitTicketResult } from '../../types';
import { formatDate } from '../../utils/dateUtils';
import { Button } from '../ui/Button';
import { LessonPlanView } from './LessonPlanView';
import { useState } from 'react';
import { useStudentIdentifiers } from '../../hooks/useStudentIdentifiers';

interface Props {
  plan: LessonPlan;
  exitTicket: ExitTicketResult;
  studentId: number;
  studentGrade: string;
  lessonPlanId?: string;
  onBack: () => void;
}

export function LessonPlanDetails({ plan, exitTicket, studentId, studentGrade, lessonPlanId, onBack }: Props) {
  const [viewMode, setViewMode] = useState<'details' | 'full'>('details');
  const { getIdentifier } = useStudentIdentifiers([studentId]);

  if (viewMode === 'full') {
    return (
      <LessonPlanView 
        lessonPlan={plan}
        struggledAreas={exitTicket.struggledAreas}
        lessonPlanId={lessonPlanId}
        exitTicketId={exitTicket.id}
        onBack={() => setViewMode('details')}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h2 className="font-oswald text-2xl font-medium text-svef-gray">
            {exitTicket.lastLesson}
          </h2>
          <div className="flex items-center space-x-4 text-sm text-svef-gray">
            <span>{getIdentifier(studentId)}</span>
            <span>Grade {studentGrade}</span>
            <span>{formatDate(exitTicket.timestamp)}</span>
          </div>
        </div>
        <div>
          <Button variant="secondary" onClick={onBack} className="flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to History</span>
          </Button>
          <Button onClick={() => setViewMode('full')} className="ml-2">
            View Full Lesson Plan
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {plan.emReference && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Elevate Math Curriculum Reference
            </div>
            <div className="mt-1 font-oswald text-lg text-emerald-900">{plan.emReference}</div>
          </div>
        )}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Target className="w-6 h-6 text-svef-purple" />
            <h3 className="font-oswald text-xl font-medium text-svef-gray">Objective</h3>
          </div>
          <p className="font-roboto text-svef-gray">{plan.objective}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Users className="w-6 h-6 text-svef-purple" />
              <h3 className="font-oswald text-xl font-medium text-svef-gray">
                Engagement ({plan.duration} min)
              </h3>
            </div>
            <ul className="space-y-3">
              {plan.engagement.map((item, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-svef-purple mt-2" />
                  <span className="font-roboto text-svef-gray">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-2 mb-4">
              <BookOpen className="w-6 h-6 text-svef-purple" />
              <h3 className="font-oswald text-xl font-medium text-svef-gray">Representation</h3>
            </div>
            <ul className="space-y-3">
              {plan.representation.map((item, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-svef-purple mt-2" />
                  <span className="font-roboto text-svef-gray">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Clock className="w-6 h-6 text-svef-purple" />
              <h3 className="font-oswald text-xl font-medium text-svef-gray">Action & Expression</h3>
            </div>
            <ul className="space-y-3">
              {plan.actionExpression.map((item, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-svef-purple mt-2" />
                  <span className="font-roboto text-svef-gray">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-2 mb-4">
              <CheckCircle className="w-6 h-6 text-svef-purple" />
              <h3 className="font-oswald text-xl font-medium text-svef-gray">Wrap-up</h3>
            </div>
            <ul className="space-y-3">
              {plan.wrapup.map((item, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-svef-purple mt-2" />
                  <span className="font-roboto text-svef-gray">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-oswald text-xl font-medium text-svef-gray mb-4">Assessment Results</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-svef-gray mb-1">Score</p>
              <p className="font-medium text-xl text-svef-purple">
                {exitTicket.score}/{exitTicket.totalQuestions}
              </p>
            </div>
            <div>
              <p className="text-sm text-svef-gray mb-1">Areas of Focus</p>
              <div className="flex flex-wrap gap-2">
                {exitTicket.struggledAreas.map((area, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-svef-beige/30 rounded-md text-xs text-svef-gray"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}