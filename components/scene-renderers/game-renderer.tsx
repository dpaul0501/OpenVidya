'use client';

import { useState } from 'react';
import type { GameContent } from '@/lib/types/stage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GameRendererProps {
  readonly content: GameContent;
  readonly mode: 'autonomous' | 'playback';
  readonly sceneId: string;
}

export function GameRenderer({ content, mode: _mode, sceneId: _sceneId }: GameRendererProps) {
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
  const [showResults, setShowResults] = useState(false);
  const [totalScore, setTotalScore] = useState(0);

  const challenges = content.challenges || [];
  const currentChallenge = challenges[currentChallengeIndex];
  const isLastChallenge = currentChallengeIndex === challenges.length - 1;

  const handleSelectAnswer = (optionIndex: number) => {
    if (!showResults) {
      setSelectedAnswers(prev => ({
        ...prev,
        [currentChallengeIndex]: optionIndex,
      }));
    }
  };

  const handleSubmitAnswer = () => {
    if (currentChallenge) {
      const isCorrect = selectedAnswers[currentChallengeIndex] === currentChallenge.correctAnswer;
      const points = isCorrect
        ? currentChallenge.points || 10
        : -(content.scoringSystem?.pointsPerWrong || 0);
      setTotalScore(prev => prev + points);
      setShowResults(true);
    }
  };

  const handleNextChallenge = () => {
    if (isLastChallenge) {
      // Game complete
      setShowResults(false);
      setCurrentChallengeIndex(0);
      setSelectedAnswers({});
      setTotalScore(0);
    } else {
      setShowResults(false);
      setCurrentChallengeIndex(prev => prev + 1);
    }
  };

  if (!currentChallenge) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <Card className="max-w-2xl w-full">
          <CardContent className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-2xl font-bold mb-2">Game Complete!</h2>
            <p className="text-muted-foreground mb-4">
              Final Score: <span className="text-2xl font-bold text-primary">{totalScore}</span>
            </p>
            <Button onClick={() => setCurrentChallengeIndex(0)}>
              Retake Challenge
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedAnswer = selectedAnswers[currentChallengeIndex];
  const isAnswerSelected = selectedAnswer !== undefined;
  const isCorrect = selectedAnswer === currentChallenge.correctAnswer;

  return (
    <div className="w-full h-full overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Game Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{content.title}</CardTitle>
            <p className="text-muted-foreground mt-2">{content.description}</p>
            <div className="mt-4 flex gap-4 text-sm">
              <div>Type: <span className="font-semibold capitalize">{content.gameType}</span></div>
              <div>Challenge: <span className="font-semibold">{currentChallengeIndex + 1} / {challenges.length}</span></div>
              <div>Score: <span className="font-semibold">{totalScore}</span></div>
            </div>
          </CardHeader>
        </Card>

        {/* Challenge Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{currentChallenge.question}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentChallenge.options?.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectAnswer(index)}
                  disabled={showResults}
                  className={cn(
                    'w-full p-4 text-left rounded-lg border-2 transition-all',
                    selectedAnswer === index
                      ? isCorrect && showResults
                        ? 'border-green-500 bg-green-50'
                        : !isCorrect && showResults
                          ? 'border-red-500 bg-red-50'
                          : 'border-primary bg-primary/10'
                      : index === currentChallenge.correctAnswer && showResults
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-primary/50',
                    showResults && 'cursor-default'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {showResults && index === currentChallenge.correctAnswer && (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    )}
                    {showResults && selectedAnswer === index && !isCorrect && (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                    <span className={selectedAnswer === index && showResults ? 'font-semibold' : ''}>
                      {option}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Results Section */}
            {showResults && (
              <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
                <p className="font-semibold mb-2">
                  {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                </p>
                {currentChallenge.explanation && (
                  <p className="text-sm text-muted-foreground">{currentChallenge.explanation}</p>
                )}
                <p className="text-sm mt-2">
                  Points: <span className={isCorrect ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {isCorrect ? `+${currentChallenge.points || 10}` : `-${content.scoringSystem?.pointsPerWrong || 0}`}
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          {!showResults ? (
            <Button
              onClick={handleSubmitAnswer}
              disabled={!isAnswerSelected}
              className="px-8"
            >
              Submit Answer
            </Button>
          ) : (
            <Button
              onClick={handleNextChallenge}
              className="px-8"
            >
              {isLastChallenge ? 'Complete Game' : 'Next Challenge'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
