import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowUp, ArrowDown, MessageCircle, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface QuestionCardProps {
  question: {
    id: string;
    title: string;
    description: string;
    votes_count: number;
    answers_count: number;
    views_count: number;
    is_answered: boolean;
    created_at: string;
    tags?: { name: string; color: string }[];
    profiles?: {
      username: string;
      display_name: string;
    };
  };
}

export default function QuestionCard({ question }: QuestionCardProps) {
  const navigate = useNavigate();
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (voteType: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVoting(true);
    // Voting logic will be implemented here
    setIsVoting(false);
  };

  const handleCardClick = () => {
    navigate(`/questions/${question.id}`);
  };

  // Strip HTML tags for preview
  const getTextPreview = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-foreground hover:text-primary transition-colors">
              {question.title}
            </h3>
            <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
              {getTextPreview(question.description)}
            </p>
          </div>
          {question.is_answered && (
            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
              <Check className="w-3 h-3 mr-1" />
              Answered
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Tags */}
        {question.tags && question.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {question.tags.map((tag, index) => (
              <Badge 
                key={index} 
                variant="outline"
                style={{ 
                  borderColor: tag.color,
                  color: tag.color 
                }}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats and Author */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Vote count */}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleVote(1, e)}
                disabled={isVoting}
                className="h-8 px-2"
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium">{question.votes_count}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleVote(-1, e)}
                disabled={isVoting}
                className="h-8 px-2"
              >
                <ArrowDown className="w-4 h-4" />
              </Button>
            </div>

            {/* Answer count */}
            <div className="flex items-center space-x-1 text-muted-foreground">
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm">{question.answers_count}</span>
            </div>

            {/* View count */}
            <span className="text-sm text-muted-foreground">
              {question.views_count} views
            </span>
          </div>

          {/* Author and timestamp */}
          <div className="flex items-center space-x-2">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-xs">
                {question.profiles?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">
                {question.profiles?.display_name || question.profiles?.username || 'Anonymous'}
              </span>
              <span className="ml-1">
                {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}