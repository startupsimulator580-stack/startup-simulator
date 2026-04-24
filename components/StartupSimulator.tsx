"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  RotateCcw,
  Trophy,
  Skull,
  ChevronRight,
  TrendingUp,
  Shield,
  Coins,
  Users,
  Siren,
  Check,
  X,
  Crown,
  Lock,
} from 'lucide-react';

type Effect = {
  money: number;
  marketing: number;
  ip: number;
  competition: number;
  customerService: number;
};

type Choice = {
  label: string;
  effect: Effect;
  feedback: string;
  next: string;
};

type NodeType = {
  stage: string;
  week: string;
  text: string;
  choices: Choice[];
};

type HistoryItem = {
  stage: string;
  label: string;
  feedback: string;
  rating: 'good' | 'ok' | 'bad';
};

type MinigameState = null | {
  type: 'validation' | 'pitch';
  phase?: number;
  phase1Result?: number | null;
  question?: string;
  helper?: string;
  questionPhase2?: string;
  helperPhase2?: string;
  optionsPhase1?: { text: string; correct: boolean }[];
  options?: { text: string; correct: boolean }[];
};

type GameState = {
  startedAt: number | null;
  endedAt: number | null;
  upcomingPath: string[];
  screen: 'intro' | 'game';
  money: number;
  marketing: number;
  ip: number;
  competition: number;
  customerService: number;
  unstableChoices: number;
  dangerReturnId: string;
  currentId: string;
  history: HistoryItem[];
  path: string[];
  goldNodeResults: Record<string, 'hit' | 'miss'>;
  gameOver: boolean;
  win: boolean;
  founderType: string;
  endingReason: string;
  endingTitle: string;
  minigame: MinigameState;
  pitchMarker: number;
  pitchDirection: number;
};

const initialState: GameState = {
  startedAt: null,
  endedAt: null,
  upcomingPath: [],
  screen: 'intro',
  money: 55,
  marketing: 20,
  ip: 10,
  competition: 20,
  customerService: 15,
  unstableChoices: 0,
  dangerReturnId: 'business',
  currentId: 'hobby',
  history: [],
  path: ['hobby'],
  goldNodeResults: {},
  gameOver: false,
  win: false,
  founderType: '',
  endingReason: '',
  endingTitle: '',
  minigame: null,
  pitchMarker: 10,
  pitchDirection: 1,
};

const clamp = (n: number) => Math.max(0, Math.min(100, n));

const evaluateChoice = (effect: Effect): 'good' | 'ok' | 'bad' => {
  const score =
    effect.money * 0.6 +
    effect.marketing * 1.1 +
    effect.ip * 0.9 +
    effect.customerService * 1.1 -
    effect.competition * 1.15;
  if (score > 6) return 'good';
  if (score < -6) return 'bad';
  return 'ok';
};

const ratingStyles = {
  good: {
    text: 'text-green-300',
    button: 'border-green-400 bg-[#123524] ring-2 ring-green-300',
    pill: 'bg-[#173327] text-[#7dffb1] border-[#7dffb1]',
    label: 'Good move',
  },
  ok: {
    text: 'text-yellow-300',
    button: 'border-yellow-400 bg-[#3a3314] ring-2 ring-yellow-300',
    pill: 'bg-[#3a3314] text-[#ffe66d] border-[#ffe66d]',
    label: 'Playable move',
  },
  bad: {
    text: 'text-red-300',
    button: 'border-red-400 bg-[#35161d] ring-2 ring-red-300',
    pill: 'bg-[#3a161d] text-[#ff8d8d] border-[#ff8d8d]',
    label: 'Danger move',
  },
} as const;

const getStatTone = (_key: string, rawValue: number) => {
  if (rawValue >= 67) return 'green';
  if (rawValue >= 34) return 'yellow';
  return 'red';
};

const statToneClasses = {
  green: {
    text: 'text-green-300',
    chip: 'bg-[#123524] border-green-200',
    bar: 'bg-[#111633] [&>div]:bg-green-500',
  },
  yellow: {
    text: 'text-yellow-300',
    chip: 'bg-[#3a3314] border-yellow-200',
    bar: 'bg-[#111633] [&>div]:bg-yellow-500',
  },
  red: {
    text: 'text-red-300',
    chip: 'bg-[#35161d] border-red-200',
    bar: 'bg-[#111633] [&>div]:bg-red-500',
  },
};

const statMeta = {
  money: { label: 'Money', icon: Coins, positive: true },
  marketing: { label: 'Marketing', icon: TrendingUp, positive: true },
  ip: { label: 'IP', icon: Shield, positive: true },
  competition: { label: 'Market Opportunity', icon: Siren, positive: true },
  customerService: { label: 'Customer Service', icon: Users, positive: true },
};

const GOLD_NODES = new Set(['idea', 'pitch']);
const DANGER_NODES = new Set([
  'danger_validation_1',
  'danger_validation_2A',
  'danger_validation_2B',
  'danger_validation_2C',
  'danger_validation_3',
]);

const validationMinigame = {
  type: 'validation' as const,
  phase: 1,
  question: 'Where do you find people to interview?',
  helper: 'Pick 3 sources that actually represent your target customer.',
  optionsPhase1: [
    { text: 'Friends', correct: false },
    { text: 'Family', correct: false },
    { text: 'Competitors’ customers', correct: true },
    { text: 'Target market on Discord/Reddit', correct: true },
    { text: 'Local musicians', correct: true },
  ],
  questionPhase2: 'Pick the 3 best customer interview questions',
  helperPhase2: 'Choose questions that reveal real behavior and pain.',
  options: [
    { text: 'How much would you pay?', correct: false },
    { text: 'What problems do you have with your current solution?', correct: true },
    { text: 'Would you buy this product?', correct: false },
    { text: 'When was the last time you experienced this problem?', correct: true },
    { text: 'What have you tried before?', correct: true },
    { text: 'Do you like this idea?', correct: false },
    { text: 'If this fails, can I still tell people you believed in me?', correct: false },
  ],
  successNext: 'business',
};

const pitchMinigame = {
  type: 'pitch' as const,
  question: 'Stop the pitch meter inside the green zone',
  helper:
    'Too far left = painfully vague. Too far right = a five-minute monologue about capacitor tolerances. Land in the middle to sound sharp, clear, and credible.',
  explanation:
    'A strong pitch balances clarity, credibility, and excitement. If you are too vague, nobody understands the value. If you are too technical, the room mentally leaves the building.',
  successNext: 'ip_entry',
};

const nodes: Record<string, NodeType> = {
  danger_validation_1: {
    stage: 'Validation Danger',
    week: 'Week 3',
    text: 'You move forward with OnlyPedal, but early users do not really get it. Some say it sounds cool, but not useful. You now need to decide how to react to weak validation.',
    choices: [
      { label: 'Double down and push marketing harder', effect: { money: -5, marketing: 8, ip: 0, competition: 5, customerService: -5 }, feedback: 'You bought attention before you earned understanding. That can create a short-lived illusion of traction.', next: 'danger_validation_2A' },
      { label: 'Go back and interview real users properly', effect: { money: -4, marketing: 2, ip: 0, competition: 0, customerService: 5 }, feedback: 'Painful, but smart. Going backward for better signal can save a company from building the wrong thing.', next: 'danger_validation_2B' },
      { label: 'Pivot the product into something adjacent', effect: { money: -6, marketing: 3, ip: -3, competition: -2, customerService: 0 }, feedback: 'Pivoting sounds bold, but without clarity it can turn one unclear startup into two.', next: 'danger_validation_2C' },
    ],
  },
  danger_validation_2A: {
    stage: 'Validation Danger',
    week: 'Week 3',
    text: 'Your ads perform well at first. People click. Curiosity rises. But conversions stay weak and confused comments start piling up.',
    choices: [
      { label: 'Keep scaling ads anyway', effect: { money: -8, marketing: 5, ip: 0, competition: 4, customerService: -8 }, feedback: 'You amplified a weak message. Scaling confusion is still confusion.', next: 'danger_validation_3' },
      { label: 'Pause and fix the product story', effect: { money: -3, marketing: 1, ip: 0, competition: -1, customerService: 4 }, feedback: 'Good recovery instinct. When the message is failing, more spend is rarely the answer.', next: 'danger_validation_2B' },
      { label: 'Blame the audience for not being visionary enough', effect: { money: -2, marketing: -1, ip: 0, competition: 2, customerService: -6 }, feedback: 'Founders who insult the market usually do not get a second market.', next: 'danger_validation_3' },
    ],
  },
  danger_validation_2B: {
    stage: 'Validation Recovery',
    week: 'Week 4',
    text: 'You go back to real users and listen more carefully. This time, you hear repeated complaints and clearer language about what actually matters.',
    choices: [
      { label: 'Focus the product around the repeated pain point', effect: { money: -2, marketing: 5, ip: 0, competition: -3, customerService: 6 }, feedback: 'This is the comeback path. Clarity from users often beats confidence from founders.', next: 'business' },
      { label: 'Split the product into two versions immediately', effect: { money: -5, marketing: 2, ip: 1, competition: 1, customerService: -2 }, feedback: 'Tempting, but adding complexity before core fit is proven often weakens both versions.', next: 'danger_validation_3' },
      { label: 'Keep the original idea but rewrite the story', effect: { money: -1, marketing: 4, ip: 0, competition: 0, customerService: 2 }, feedback: 'Sometimes the product is fine and the framing is the real problem. This can work if the pain is still real.', next: 'business' },
    ],
  },
  danger_validation_2C: {
    stage: 'Validation Danger',
    week: 'Week 4',
    text: 'You pivot quickly into a neighboring idea. It sounds fresh, but now your story is blurry and your early signal is harder to trust.',
    choices: [
      { label: 'Commit fully to the new idea', effect: { money: -5, marketing: 3, ip: -2, competition: 1, customerService: -3 }, feedback: 'A pivot can save a startup, but a vague pivot usually just relocates the confusion.', next: 'danger_validation_3' },
      { label: 'Return to the original idea with better validation', effect: { money: -3, marketing: 2, ip: 0, competition: -1, customerService: 4 }, feedback: 'Good reset. The original opportunity may still work if you understand it properly this time.', next: 'danger_validation_2B' },
      { label: 'Tell everyone you are now an AI company somehow', effect: { money: -1, marketing: 4, ip: 0, competition: 5, customerService: -4 }, feedback: 'This may improve your buzzword score, but not necessarily your product clarity.', next: 'danger_validation_3' },
    ],
  },
  danger_validation_3: {
    stage: 'Validation Danger',
    week: 'Week 5',
    text: 'Time and money are running thin. You still have a shot, but this is close to becoming a slow-motion startup death spiral.',
    choices: [
      { label: 'Focus on one clear customer problem and cut distractions', effect: { money: -2, marketing: 4, ip: 0, competition: -2, customerService: 5 }, feedback: 'This is the disciplined move. Narrowing down can rescue a messy startup.', next: 'business' },
      { label: 'Keep experimenting randomly until something feels lucky', effect: { money: -6, marketing: 1, ip: 0, competition: 4, customerService: -5 }, feedback: 'Random motion can feel productive, but it rarely compounds into signal.', next: 'ending' },
      { label: 'Consult a mentor who tells you what you should have done two weeks ago', effect: { money: 0, marketing: 2, ip: 0, competition: -1, customerService: 3 }, feedback: 'The mentor points out that weak validation usually comes from talking to the wrong people and asking the wrong questions.', next: 'business' },
    ],
  },
  hobby: {
    stage: 'Hobby',
    week: 'Week 0',
    text: 'You have an idea for OnlyPedal. What do you do first?',
    choices: [
      { label: 'Start building immediately', effect: { money: -5, marketing: 1, ip: 6, competition: 4, customerService: 0 }, feedback: 'You moved fast, but skipped validation. This can work—but it increases risk.', next: 'idea' },
      { label: 'Research the problem before building anything', effect: { money: -1, marketing: 6, ip: 0, competition: -3, customerService: 5 }, feedback: 'You focused on understanding pain first. This builds stronger foundations.', next: 'idea' },
      { label: 'Ask friends if it sounds cool', effect: { money: 0, marketing: 2, ip: 0, competition: 2, customerService: -2 }, feedback: 'Feels like validation, but it’s mostly politeness. Weak signal.', next: 'idea' },
    ],
  },
  idea: {
    stage: 'Validation',
    week: 'Week 2',
    text: 'How do you validate whether people actually want OnlyPedal?',
    choices: [
      { label: 'Interview 20 target users', effect: { money: -3, marketing: 7, ip: 0, competition: -4, customerService: 5 }, feedback: 'Strong approach—but only if you ask the right questions. Bad questions still give bad validation.', next: 'MINIGAME_VALIDATION' },
      { label: 'Run ads to test if people click or sign up', effect: { money: -6, marketing: 8, ip: -1, competition: 4, customerService: 1 }, feedback: 'This can reveal real interest quickly, but it’s expensive and can mislead if your messaging is off.', next: 'business' },
      { label: 'Ask people if they would buy it', effect: { money: 0, marketing: 2, ip: 0, competition: 2, customerService: -3 }, feedback: 'This feels like validation, but people often say yes to be nice. Hypothetical answers are unreliable.', next: 'business' },
    ],
  },
  business: {
    stage: 'Business Plan',
    week: 'Week 4',
    text: 'You need a simple plan before moving forward. What do you focus on?',
    choices: [
      { label: 'Build a full detailed business plan covering everything', effect: { money: 2, marketing: 1, ip: 0, competition: 0, customerService: 1 }, feedback: 'Looks professional, but most is guesswork right now. Risk of overplanning.', next: 'resources' },
      { label: 'Focus only on costs and margins', effect: { money: 5, marketing: 0, ip: 0, competition: 0, customerService: -1 }, feedback: 'Important, but ignores whether people actually want it.', next: 'resources' },
      { label: 'Answer only: who pays, and why?', effect: { money: 3, marketing: 6, ip: 0, competition: -2, customerService: 3 }, feedback: 'This is the core of a real business. Everything flows from this.', next: 'resources' },
    ],
  },
  resources: {
    stage: 'Execution',
    week: 'Week 5',
    text: 'You hit a technical roadblock building OnlyPedal. What do you do?',
    choices: [
      { label: 'Figure it out alone', effect: { money: -3, marketing: 0, ip: 2, competition: 2, customerService: -1 }, feedback: 'You made progress, but slowly. You ignored available leverage.', next: 'simplicity' },
      { label: 'Use AI + YouTube to solve it', effect: { money: -1, marketing: 2, ip: 4, competition: -1, customerService: 1 }, feedback: 'Fast and efficient. AI dramatically reduces iteration time.', next: 'simplicity' },
      { label: 'Ask niche Discord communities', effect: { money: 0, marketing: 3, ip: 3, competition: -2, customerService: 3 }, feedback: 'High leverage move. You tapped into people already solving similar problems.', next: 'simplicity' },
    ],
  },
  simplicity: {
    stage: 'Product Scope',
    week: 'Week 5',
    text: 'You are finalizing the MVP. How much do you include in version one?',
    choices: [
      { label: 'Pack in every feature people might ever want', effect: { money: -5, marketing: 1, ip: 1, competition: 1, customerService: -4 }, feedback: 'Feature creep feels ambitious, but it usually makes the product harder to build, explain, and trust.', next: 'pitch' },
      { label: 'Copy the feature set of established competitors', effect: { money: -2, marketing: 1, ip: 0, competition: 3, customerService: 0 }, feedback: 'Safer on paper, but weak differentiation makes it harder to stand out.', next: 'pitch' },
      { label: 'Launch with one killer feature users understand instantly', effect: { money: 2, marketing: 6, ip: 2, competition: -2, customerService: 3 }, feedback: 'This is how novel products become marketable. Simple products are easier to explain, ship, and remember.', next: 'pitch' },
    ],
  },
  pitch: {
    stage: 'Pitch',
    week: 'Week 6',
    text: 'You get to pitch OnlyPedal at a startup event. How do you structure it?',
    choices: [
      { label: 'Start with the customer problem, then show the solution', effect: { money: 4, marketing: 8, ip: 0, competition: -2, customerService: 3 }, feedback: 'Strong framing. Investors understand why the product matters before seeing it.', next: 'MINIGAME_PITCH' },
      { label: 'Open with a live demo of the product', effect: { money: 3, marketing: 6, ip: 1, competition: 1, customerService: 2 }, feedback: 'Engaging, but risky. If people don’t understand the context, the demo can confuse instead of convince.', next: 'MINIGAME_PITCH' },
      { label: 'Lead with market size and big vision', effect: { money: 5, marketing: 5, ip: 0, competition: 2, customerService: 0 }, feedback: 'This can excite investors, but without grounding in the product, it can feel disconnected.', next: 'MINIGAME_PITCH' },
    ],
  },
  ip_entry: {
    stage: 'IP Zone',
    week: 'Week 7',
    text: 'OnlyPedal feels novel. What is your protection strategy before launch?',
    choices: [
      { label: 'Skip IP and move fast', effect: { money: 2, marketing: 4, ip: -5, competition: 4, customerService: 0 }, feedback: 'Speed helps, but you are entering launch with very little protection. Competition risk rises.', next: 'ip_no_protection' },
      { label: 'Trademark the name only', effect: { money: -2, marketing: 2, ip: 3, competition: 1, customerService: 0 }, feedback: 'Better than nothing. Brand protection matters, but it does not really defend the product concept itself.', next: 'ip_claims' },
      { label: 'Trademark the name and file a provisional patent application', effect: { money: -4, marketing: 3, ip: 7, competition: -2, customerService: 0 }, feedback: 'Strong balance. You buy time, signal seriousness, and still keep launch momentum.', next: 'ip_claims' },
    ],
  },
  ip_no_protection: {
    stage: 'IP Zone',
    week: 'Week 7',
    text: 'You chose speed without real protection. A similar product could appear quickly. How do you compensate?',
    choices: [
      { label: 'Double down on brand and audience building', effect: { money: -1, marketing: 5, ip: 0, competition: -1, customerService: 2 }, feedback: 'Good recovery move. If protection is weak, brand and distribution matter even more.', next: 'launch' },
      { label: 'Hope nobody notices the opportunity', effect: { money: 0, marketing: -2, ip: 0, competition: 3, customerService: 0 }, feedback: 'Hope is not a moat. You are now relying on luck instead of strategy.', next: 'launch' },
      { label: 'Race to launch while improving the filing strategy later', effect: { money: 1, marketing: 3, ip: 1, competition: 1, customerService: 0 }, feedback: 'Reasonable, but you are still exposed. Launch speed now becomes critical.', next: 'launch' },
    ],
  },
  ip_claims: {
    stage: 'IP Claims',
    week: 'Week 8',
    text: 'You need to define what you are actually trying to protect. What kind of claims strategy do you pursue?',
    choices: [
      { label: 'Write extremely broad claims that try to own the entire category', effect: { money: -1, marketing: 0, ip: 1, competition: 1, customerService: 0 }, feedback: 'Ambitious, but broad claims are more likely to be challenged or rejected if they are not grounded enough.', next: 'ip_appeal' },
      { label: 'Write narrow claims around your strongest specific implementation', effect: { money: -1, marketing: 0, ip: 5, competition: -1, customerService: 0 }, feedback: 'This is often the strongest early move. Specific, defensible claims are more useful than fantasy territory.', next: 'launch' },
      { label: 'Describe the invention vaguely and trust the lawyer to figure it out later', effect: { money: -2, marketing: 0, ip: -2, competition: 2, customerService: 0 }, feedback: 'Weak input usually creates weak protection. You still need clarity on what the real edge is.', next: 'ip_appeal' },
    ],
  },
  ip_appeal: {
    stage: 'IP Appeal',
    week: 'Week 8',
    text: 'Your initial protection strategy ran into trouble. What do you do next?',
    choices: [
      { label: 'Refine the claims around the strongest real differentiator', effect: { money: -2, marketing: 0, ip: 4, competition: -1, customerService: 0 }, feedback: 'Strong recovery. Good IP usually gets sharper after pressure, not broader.', next: 'launch' },
      { label: 'Abandon the filing and rely purely on first-mover advantage', effect: { money: 1, marketing: 2, ip: -3, competition: 2, customerService: 0 }, feedback: 'Sometimes speed is enough, but now your launch execution must carry much more weight.', next: 'launch' },
      { label: 'Keep arguing for the same weak claims without changing anything', effect: { money: -4, marketing: -1, ip: -1, competition: 2, customerService: 0 }, feedback: 'Stubbornness is not strategy. You burned time without improving the position.', next: 'launch' },
    ],
  },
  launch: {
    stage: 'Launch Strategy',
    week: 'Week 8',
    text: 'How do you test demand and build launch momentum?',
    choices: [
      { label: 'Do a $1 pledge campaign, collect emails and numbers, then warm them up for Kickstarter', effect: { money: 2, marketing: 8, ip: 0, competition: -1, customerService: 3 }, feedback: 'Excellent launch sequencing. You validate demand, build audience, and improve conversion before preorders open.', next: 'investor' },
      { label: 'Skip straight to Kickstarter with no warm audience', effect: { money: 1, marketing: 2, ip: 0, competition: 1, customerService: 0 }, feedback: 'It can work, but you are making the hardest part of launch even harder by starting cold.', next: 'investor' },
      { label: 'Stay secret until everything is perfect', effect: { money: -2, marketing: -2, ip: 1, competition: 2, customerService: 0 }, feedback: 'Perfectionism delays learning. Silence protects the idea a bit, but also starves your launch of momentum.', next: 'investor' },
    ],
  },
  investor: {
    stage: 'Investor',
    week: 'Week 9',
    text: 'An investor is interested. What kind of investor do you want?',
    choices: [
      { label: 'The one offering the most money', effect: { money: 8, marketing: 1, ip: 0, competition: 0, customerService: -1 }, feedback: 'More money helps, but money without alignment or network can become expensive in other ways.', next: 'sourcing' },
      { label: 'Someone with a strong network who will actively help', effect: { money: 5, marketing: 6, ip: 1, competition: -2, customerService: 2 }, feedback: 'This is often the best kind of early investor. Leverage beats cash alone.', next: 'sourcing' },
      { label: 'Reject all investors on principle', effect: { money: -2, marketing: 0, ip: 0, competition: 1, customerService: 0 }, feedback: 'Bootstrapping can be smart, but refusing help blindly can close doors you may actually need.', next: 'sourcing' },
    ],
  },
  sourcing: {
    stage: 'Part Sourcing',
    week: 'Week 10',
    text: 'You need parts for OnlyPedal. How do you source them?',
    choices: [
      { label: 'Use Alibaba/AliExpress, test samples, and verify quality yourself', effect: { money: 6, marketing: 0, ip: 0, competition: -1, customerService: 3 }, feedback: 'This is how many real businesses source. The platform is useful—the key is testing and quality control.', next: 'pricing' },
      { label: 'Buy only from expensive branded resellers', effect: { money: -4, marketing: 0, ip: 0, competition: 0, customerService: 2 }, feedback: 'Safer feeling, but often just higher cost for the same underlying part.', next: 'pricing' },
      { label: 'Order the absolute cheapest parts without testing them', effect: { money: 3, marketing: 0, ip: 0, competition: 1, customerService: -6 }, feedback: 'Cheap parts are not the issue. Untested parts are. Quality failures hit customers first.', next: 'pricing' },
    ],
  },
  pricing: {
    stage: 'Pricing',
    week: 'Week 11',
    text: 'How do you price OnlyPedal?',
    choices: [
      { label: 'Undercut competitors to win buyers fast', effect: { money: -4, marketing: 3, ip: 0, competition: 1, customerService: 1 }, feedback: 'Low prices can create traction, but they also weaken margins and can hurt premium positioning.', next: 'manufacturing' },
      { label: 'Match the market and stay flexible', effect: { money: 2, marketing: 1, ip: 0, competition: 0, customerService: 1 }, feedback: 'Safe and reasonable, but not especially memorable.', next: 'manufacturing' },
      { label: 'Price as a premium product and justify it clearly', effect: { money: 5, marketing: 3, ip: 1, competition: -1, customerService: 2 }, feedback: 'Strong if the positioning is real. Price is part of the brand, not just a number.', next: 'manufacturing' },
    ],
  },
  manufacturing: {
    stage: 'Manufacturing',
    week: 'Week 12',
    text: 'You are ready to produce your first batch. What is your approach?',
    choices: [
      { label: 'Start with a small local batch for control', effect: { money: -3, marketing: 0, ip: 0, competition: 0, customerService: 4 }, feedback: 'Higher cost, but more control. This reduces risk early.', next: 'shipping' },
      { label: 'Use an overseas manufacturer after sample testing', effect: { money: 4, marketing: 0, ip: 0, competition: -1, customerService: 2 }, feedback: 'Strong balance of scale and cost if quality control is real.', next: 'shipping' },
      { label: 'Place a huge first order immediately to maximize margin', effect: { money: 6, marketing: 0, ip: 0, competition: 1, customerService: -4 }, feedback: 'Looks efficient, but one bad assumption can become a warehouse full of regret.', next: 'shipping' },
    ],
  },
  shipping: {
    stage: 'Shipping',
    week: 'Week 13',
    text: 'Orders are coming in. How do you handle shipping?',
    choices: [
      { label: 'Pack and ship everything yourself', effect: { money: 1, marketing: 0, ip: 0, competition: 0, customerService: 2 }, feedback: 'Good for learning and quality control, but it can quickly become a bottleneck.', next: 'customer_issues' },
      { label: 'Use a fulfillment partner once volume is real', effect: { money: 3, marketing: 0, ip: 0, competition: -1, customerService: 3 }, feedback: 'Operational leverage matters. Systems beat heroics over time.', next: 'customer_issues' },
      { label: 'Delay shipments until every little issue is gone', effect: { money: -3, marketing: -1, ip: 0, competition: 1, customerService: -5 }, feedback: 'Perfectionism after purchase usually feels like unreliability to customers.', next: 'customer_issues' },
    ],
  },
  customer_issues: {
    stage: 'Customer Support',
    week: 'Week 14',
    text: 'Early customers report confusion and minor bugs. What do you do?',
    choices: [
      { label: 'Fix the issues and communicate clearly', effect: { money: -2, marketing: 1, ip: 0, competition: -1, customerService: 6 }, feedback: 'Trust compounds when customers feel heard and informed.', next: 'reviews' },
      { label: 'Keep building and deal with support later', effect: { money: 1, marketing: 0, ip: 0, competition: 1, customerService: -5 }, feedback: 'Ignoring support saves time briefly, then costs much more later.', next: 'reviews' },
      { label: 'Assume most issues are user error', effect: { money: 0, marketing: -1, ip: 0, competition: 1, customerService: -6 }, feedback: 'Even when users are wrong, making them feel stupid is usually a losing strategy.', next: 'reviews' },
    ],
  },
  reviews: {
    stage: 'Reviews',
    week: 'Week 15',
    text: 'Reviews start appearing online. How do you respond?',
    choices: [
      { label: 'Encourage honest reviews and learn from them', effect: { money: 1, marketing: 5, ip: 0, competition: -1, customerService: 3 }, feedback: 'Real reviews build credibility and reveal what actually matters to buyers.', next: 'growth' },
      { label: 'Try to manufacture social proof with fake reviews', effect: { money: 1, marketing: 3, ip: 0, competition: 1, customerService: -6 }, feedback: 'Short-term image, long-term trust risk. Reputation games are dangerous.', next: 'growth' },
      { label: 'Ignore reviews and focus only on building', effect: { money: 0, marketing: -2, ip: 0, competition: 0, customerService: -1 }, feedback: 'Missed signal. Reviews are one of the fastest ways to sharpen positioning.', next: 'growth' },
    ],
  },
  growth: {
    stage: 'Growth',
    week: 'Week 16',
    text: 'How do you grow after launch?',
    choices: [
      { label: 'Run paid ads immediately', effect: { money: -4, marketing: 6, ip: 0, competition: 1, customerService: 0 }, feedback: 'Ads can work, but they punish weak positioning fast.', next: 'v2_product' },
      { label: 'Build influencer and creator partnerships', effect: { money: -1, marketing: 7, ip: 0, competition: -1, customerService: 2 }, feedback: 'Strong for a niche product. Distribution through trusted voices can outperform raw ad spend.', next: 'v2_product' },
      { label: 'Wait for purely organic growth', effect: { money: 0, marketing: -3, ip: 0, competition: 1, customerService: 1 }, feedback: 'Sometimes patience is smart, but passivity is not a strategy.', next: 'v2_product' },
    ],
  },
  v2_product: {
    stage: 'Version 2',
    week: 'Week 17',
    text: 'The product is working. What do you do next?',
    choices: [
      { label: 'Add many new features to impress everyone', effect: { money: -3, marketing: 2, ip: 1, competition: 0, customerService: -4 }, feedback: 'Exciting on paper, but product sprawl often confuses both the team and the market.', next: 'competition_event' },
      { label: 'Refine the core experience and remove friction', effect: { money: 2, marketing: 3, ip: 1, competition: -1, customerService: 4 }, feedback: 'Usually the strongest move. Great products often win by getting simpler and sharper.', next: 'competition_event' },
      { label: 'Start a totally new product right away', effect: { money: -2, marketing: 1, ip: 0, competition: 1, customerService: -1 }, feedback: 'Could work, but founders often spread themselves too thin too early.', next: 'competition_event' },
    ],
  },
  competition_event: {
    stage: 'Competition Event',
    week: 'Week 18',
    text: 'A bigger company releases something similar. What is your response?',
    choices: [
      { label: 'Lower price and try to win on cost', effect: { money: -5, marketing: 2, ip: 0, competition: 1, customerService: 0 }, feedback: 'Price wars are hard to win against bigger players.', next: 'partnership' },
      { label: 'Double down on brand, niche, and trust', effect: { money: 1, marketing: 5, ip: 1, competition: -2, customerService: 3 }, feedback: 'Strong move. Features can be copied faster than brand and community.', next: 'partnership' },
      { label: 'Panic and pivot away from your original market', effect: { money: -3, marketing: -1, ip: -1, competition: 2, customerService: -2 }, feedback: 'Sometimes pivoting is smart. Panicking usually is not.', next: 'partnership' },
    ],
  },
  partnership: {
    stage: 'Partnership',
    week: 'Week 19',
    text: 'A company wants to partner with you. How do you handle it?',
    choices: [
      { label: 'Accept immediately because it sounds big', effect: { money: 4, marketing: 3, ip: 0, competition: 0, customerService: -2 }, feedback: 'Partnerships can help, but rushed deals often hide misalignment.', next: 'runway' },
      { label: 'Evaluate fit, incentives, and long-term alignment', effect: { money: 2, marketing: 4, ip: 1, competition: -1, customerService: 2 }, feedback: 'Best practice. Good partnerships multiply strengths instead of distracting from them.', next: 'runway' },
      { label: 'Reject all partnerships to stay fully independent', effect: { money: -1, marketing: 0, ip: 0, competition: 0, customerService: 0 }, feedback: 'Independence has value, but blind rejection can close useful doors.', next: 'runway' },
    ],
  },
  runway: {
    stage: 'Runway',
    week: 'Week 20',
    text: 'Cash is getting tight. What do you do?',
    choices: [
      { label: 'Cut costs aggressively and buy time', effect: { money: 4, marketing: -1, ip: 0, competition: 0, customerService: -1 }, feedback: 'Can be smart if done surgically. Bad cuts can also kill momentum.', next: 'ending' },
      { label: 'Raise capital quickly to extend runway', effect: { money: 6, marketing: 1, ip: 0, competition: 0, customerService: 0 }, feedback: 'Sometimes the right move, but urgency weakens your leverage if the business fundamentals are weak.', next: 'ending' },
      { label: 'Ignore it and hope sales solve the problem', effect: { money: -5, marketing: 0, ip: 0, competition: 1, customerService: -2 }, feedback: 'Hope is not runway. Cash problems rarely improve by being ignored.', next: 'ending' },
    ],
  },
};

function computeFounderType(stats: GameState) {
  const pairs = [
    ['The Marketer', stats.marketing],
    ['The Defender', stats.ip],
    ['The Operator', stats.customerService],
    ['The Financier', stats.money],
  ].sort((a, b) => Number(b[1]) - Number(a[1]));
  return String(pairs[0][0]);
}

function evaluateEnd(stats: GameState) {
  let baseWin = true;
  let baseReason = 'You built a strong early-stage business with healthy fundamentals and a convincing pitch.';

  if (stats.money <= 0) {
    baseWin = false;
    baseReason = 'You ran out of money before the business stabilized.';
  } else if (stats.customerService <= 0) {
    baseWin = false;
    baseReason = 'Customer trust collapsed because service and reputation broke down.';
  } else if (stats.competition >= 100) {
    baseWin = false;
    baseReason = 'Competition moved faster and overtook your position in the market.';
  } else {
    const score = stats.money + stats.marketing + stats.ip + stats.customerService - stats.competition;
    if (score < 125) {
      baseWin = false;
      baseReason = 'The business made progress, but weak fundamentals eventually caught up.';
    }
  }

  const choiceHistory = stats.history.filter((item) => !item.stage.includes('Minigame'));
  const allGoodChoices = choiceHistory.length > 0 && choiceHistory.every((item) => item.rating === 'good');
  const badRatio = stats.history.length > 0 ? stats.history.filter((item) => item.rating === 'bad').length / stats.history.length : 0;
  const hitBothMinigames = stats.goldNodeResults.idea === 'hit' && stats.goldNodeResults.pitch === 'hit';
  const visitedDanger = stats.path.some((id) => DANGER_NODES.has(id));

  if (baseWin && allGoodChoices && hitBothMinigames && !visitedDanger) {
    return {
      win: true,
      title: 'The Real Founder',
      reason: 'You did not just survive. You stacked sharp decisions, nailed both key moments, and never needed the danger route. Most founders guess. You listened, simplified, and executed.',
    };
  }

  if (baseWin && visitedDanger) {
    return {
      win: true,
      title: 'Danger Route Legend',
      reason: 'You hit the danger route, absorbed the warning, and still recovered into a win. Most runs die there. Yours did not.',
    };
  }

  if (!baseWin && badRatio >= 0.7) {
    return {
      win: false,
      title: 'The Anti-Founder',
      reason: 'You built vibes, not a business. The run leaned on guessing, overbuilding, and avoidable mistakes until the company finally folded.',
    };
  }

  return {
    win: baseWin,
    title: baseWin ? 'Startup Survived' : 'Startup Failed',
    reason: baseReason,
  };
}

function getDeltaItems(effect: Effect) {
  return Object.entries(effect)
    .filter(([, v]) => v !== 0)
    .map(([key, value]) => {
      const meta = statMeta[key as keyof typeof statMeta];
      const isPositiveOutcome = meta ? (meta.positive ? value > 0 : value < 0) : value > 0;
      return {
        key,
        label: meta?.label || key,
        Icon: meta?.icon || TrendingUp,
        value,
        display: `${value > 0 ? '+' : ''}${value}`,
        tone: isPositiveOutcome ? 'good' : 'bad',
      };
    });
}

function playTone(type: 'good' | 'ok' | 'bad') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const config = {
      good: { freq: 620, duration: 0.14 },
      ok: { freq: 420, duration: 0.12 },
      bad: { freq: 240, duration: 0.18 },
    }[type];
    oscillator.type = 'square';
    oscillator.frequency.value = config.freq;
    gain.gain.value = 0.0001;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + config.duration);
    oscillator.start(now);
    oscillator.stop(now + config.duration + 0.02);
  } catch {
    // ignore preview audio errors
  }
}

function NodeDot({ type, active, result }: { type: 'gold' | 'danger' | 'blue'; active: boolean; result?: string }) {
  const base = 'relative w-4 h-4 border-2';
  const color = type === 'gold'
    ? 'bg-yellow-300 border-yellow-600'
    : type === 'danger'
      ? 'bg-pink-400 border-red-600'
      : 'bg-cyan-300 border-blue-600';
  const activeRing = active ? 'ring-2 ring-black' : '';
  return (
    <div className={`${base} ${color} ${activeRing}`}>
      {type === 'gold' && result === 'hit' && <Check className="absolute -top-2 -right-2 h-3 w-3 rounded-full bg-[#0b0f2a] text-green-300" />}
      {type === 'gold' && result === 'miss' && <X className="absolute -top-2 -right-2 h-3 w-3 rounded-full bg-[#0b0f2a] text-red-300" />}
    </div>
  );
}

function StartupModeCard({ title, subtitle, locked = false, onClick }: { title: string; subtitle: string; locked?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={locked ? undefined : onClick}
      className={`w-full rounded-none border-2 p-5 text-left transition-all ${locked ? 'border-cyan-900 bg-[#1b1f35] text-slate-500 cursor-not-allowed' : 'border-cyan-400 bg-[#0b0f2a] text-cyan-100 hover:border-yellow-300 hover:translate-x-[2px] hover:-translate-y-[2px] shadow-[6px_6px_0_0_rgba(0,180,255,0.15)]'}`}
      disabled={locked}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{title}</div>
          <div className="text-sm mt-1">{subtitle}</div>
        </div>
        {locked && <Lock className="h-5 w-5" />}
      </div>
    </button>
  );
}

export default function StartupSimulatorPreview() {
  const musicCtxRef = useRef<AudioContext | null>(null);
  const musicTimerRef = useRef<number | null>(null);
  const musicMasterRef = useRef<GainNode | null>(null);
  const [musicVolume, setMusicVolume] = useState(65);

  const startSynthMusic = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!musicCtxRef.current) musicCtxRef.current = new AudioCtx();
      const ctx = musicCtxRef.current;

      if (musicTimerRef.current) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const master = ctx.createGain();
      master.gain.value = musicVolume / 100;
      master.connect(ctx.destination);
      musicMasterRef.current = master;

      const padGain = ctx.createGain();
      padGain.gain.value = 0.22;
      padGain.connect(master);

      const leadGain = ctx.createGain();
      leadGain.gain.value = 0.18;
      leadGain.connect(master);

      const bassGain = ctx.createGain();
      bassGain.gain.value = 0.24;
      bassGain.connect(master);

      const chords = [
        [220.0, 277.18, 329.63],
        [196.0, 246.94, 293.66],
        [174.61, 220.0, 261.63],
        [196.0, 246.94, 293.66],
        [220.0, 261.63, 329.63],
        [164.81, 220.0, 261.63],
        [174.61, 220.0, 293.66],
        [196.0, 246.94, 329.63],
      ];

      const bassline = [110.0, 98.0, 87.31, 98.0, 110.0, 82.41, 87.31, 98.0];
      const melody = [659.25, 587.33, 523.25, 587.33, 659.25, 783.99, 698.46, 587.33];

      let step = 0;
      const stepMs = 650;

      const playVoice = (freq: number, duration: number, type: OscillatorType, gainNode: GainNode, attack = 0.03, release = 0.18) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(gainNode);

        const now = ctx.currentTime;
        gain.gain.exponentialRampToValueAtTime(0.9, now + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + release);

        osc.start(now);
        osc.stop(now + duration + release + 0.02);
      };

      const playChord = (frequencies: number[]) => {
        frequencies.forEach((freq, idx) => {
          playVoice(freq, 0.48, idx === 0 ? 'triangle' : 'sine', padGain, 0.08, 0.28);
        });
      };

      const tick = () => {
        const chord = chords[step % chords.length];
        const bass = bassline[step % bassline.length];
        const note = melody[step % melody.length];

        playChord(chord);
        playVoice(bass, 0.32, 'triangle', bassGain, 0.02, 0.16);

        if (step % 2 === 0) {
          playVoice(note, 0.18, 'sine', leadGain, 0.015, 0.12);
        } else {
          playVoice(note * 0.5, 0.16, 'sine', leadGain, 0.015, 0.1);
        }

        step += 1;
      };

      tick();
      musicTimerRef.current = window.setInterval(tick, stepMs);
    } catch {}
  };

  const stopSynthMusic = () => {
    if (musicTimerRef.current) {
      clearInterval(musicTimerRef.current);
      musicTimerRef.current = null;
    }
    if (musicMasterRef.current) {
      try {
        musicMasterRef.current.disconnect();
      } catch {}
      musicMasterRef.current = null;
    }
  };

  useEffect(() => {
    if (musicMasterRef.current && musicCtxRef.current) {
      const now = musicCtxRef.current.currentTime;
      musicMasterRef.current.gain.cancelScheduledValues(now);
      musicMasterRef.current.gain.linearRampToValueAtTime(musicVolume / 100, now + 0.08);
    }
  }, [musicVolume]);

  useEffect(() => {
    return () => {
      stopSynthMusic();
      if (musicCtxRef.current && musicCtxRef.current.state !== 'closed') {
        musicCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const buildUpcomingPath = (startId: string) => {
    const preview: string[] = [];
    let current: string | undefined = startId;
    let guard = 0;
    while (current && current !== 'ending' && nodes[current] && guard < 4) {
      preview.push(current);
      const firstChoice = nodes[current].choices?.[0];
      if (!firstChoice || String(firstChoice.next).startsWith('MINIGAME_')) break;
      current = firstChoice.next as string;
      guard += 1;
    }
    return preview;
  };

  const [state, setState] = useState<GameState>(initialState);
  const [feedback, setFeedback] = useState('Choose a path and build your startup.');
  const [rating, setRating] = useState<null | 'good' | 'ok' | 'bad'>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [deltaItems, setDeltaItems] = useState<any[]>([]);
  const [selectedMinigame, setSelectedMinigame] = useState<number[]>([]);
  const [lastChoices, setLastChoices] = useState<Choice[]>([]);
  const [lastSelectedChoice, setLastSelectedChoice] = useState<string | null>(null);
  const [lastChoiceRatings, setLastChoiceRatings] = useState<Record<string, 'good' | 'ok' | 'bad'>>({});
  const [pendingDeltaMap, setPendingDeltaMap] = useState<Record<string, number>>({});
  const [pendingNextState, setPendingNextState] = useState<GameState | null>(null);
  const lockRef = useRef(false);
  const minigameRef = useRef<HTMLDivElement | null>(null);

  const node = nodes[state.currentId];

  const shuffledChoices = useMemo(() => {
    if (!node?.choices) return [];
    const arr = [...node.choices];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [state.currentId, node?.choices]);

  useEffect(() => {
    if (!state.minigame) return;
    const t = window.setTimeout(() => {
      minigameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => window.clearTimeout(t);
  }, [state.minigame]);

  useEffect(() => {
    if (!state.minigame || state.minigame.type !== 'pitch') return;
    const interval = window.setInterval(() => {
      setState((prev) => {
        if (!prev.minigame || prev.minigame.type !== 'pitch') return prev;
        let nextMarker = prev.pitchMarker + prev.pitchDirection * 6;
        let nextDirection = prev.pitchDirection;
        if (nextMarker >= 96) {
          nextMarker = 96;
          nextDirection = -1;
        }
        if (nextMarker <= 4) {
          nextMarker = 4;
          nextDirection = 1;
        }
        return { ...prev, pitchMarker: nextMarker, pitchDirection: nextDirection };
      });
    }, 90);
    return () => window.clearInterval(interval);
  }, [state.minigame]);

  const formatPlayTime = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const playTimeMs = useMemo(() => {
    if (!state.startedAt) return 0;
    const end = state.endedAt ?? Date.now();
    return Math.max(0, end - state.startedAt);
  }, [state.startedAt, state.endedAt]);

  const scorePercent = useMemo(() => {
    const scorable = state.history.filter((h) => !h.stage.includes('Minigame'));
    const total = scorable.length;
    if (total === 0) return 0;
    const good = scorable.filter((h) => h.rating === 'good').length;
    return Math.round((good / total) * 100);
  }, [state.history]);

  const founderBreakdown = useMemo(() => {
    const scorable = state.history.filter((h) => !h.stage.includes('Minigame'));
    const goodCount = scorable.filter((h) => h.rating === 'good').length;
    const okCount = scorable.filter((h) => h.rating === 'ok').length;
    const badCount = scorable.filter((h) => h.rating === 'bad').length;
    const hitBothMinigames = state.goldNodeResults.idea === 'hit' && state.goldNodeResults.pitch === 'hit';
    const visitedDanger = state.path.some((id) => DANGER_NODES.has(id));

    if (scorePercent >= 90) {
      return {
        headline: 'Elite founder run',
        summary: 'You consistently made high-signal decisions. This run looks like someone who validated early, kept the product simple, and used leverage instead of ego.',
        points: [
          'You stacked green choices instead of relying on one lucky recovery.',
          hitBothMinigames ? 'You also hit both minigames, which means your validation and pitch instincts were strong.' : 'Your main path was strong, though there is still room to tighten the key moments like validation and pitching.',
          visitedDanger ? 'You still touched danger once, but recovered well.' : 'You avoided the danger path entirely, which usually means your process stayed clean.'
        ],
        tip: 'To validate like a top founder, talk to real target users in Discord servers, Reddit threads, and niche communities. Ask about past behavior, not what they think they might do.'
      };
    }

    if (scorePercent >= 70) {
      return {
        headline: 'Strong founder instincts',
        summary: 'This was a good run. You made more strong decisions than weak ones and kept the business alive with solid judgment in the biggest moments.',
        points: [
          `You finished with ${goodCount} strong choices, which means your instincts are already better than most first-time founders.`,
          badCount > 0 ? `Your biggest drag came from ${badCount} weaker choice${badCount > 1 ? 's' : ''} that likely came from moving a little too early or trying to force certainty.` : 'You had almost no real drag in this run.',
          hitBothMinigames ? 'Your key execution moments were strong too.' : 'If you tighten your minigame performance, this can easily become an elite run.'
        ],
        tip: 'Your fastest upgrade is usually sharper validation. Find 15–20 target users, ask what problem they had last time, what they tried, and what frustrated them most.'
      };
    }

    if (scorePercent >= 40) {
      return {
        headline: 'Mid-tier founder run',
        summary: 'You had some good instincts, but the run was mixed. You likely understood parts of the game, but still drifted into guessing or complexity at the wrong times.',
        points: [
          `You had ${goodCount} strong choice${goodCount !== 1 ? 's' : ''}, so the foundation is there.`,
          `You also had ${okCount} playable move${okCount !== 1 ? 's' : ''} and ${badCount} danger move${badCount !== 1 ? 's' : ''}, which means your process was inconsistent.`,
          visitedDanger ? 'The danger route suggests you let weak signal compound before correcting.' : 'Even without the danger route, too many average choices kept the run from getting strong.'
        ],
        tip: 'The fix is not “work harder.” It is to reduce guessing. Validate earlier, simplify faster, and stop adding features before the core pain is proven.'
      };
    }

    return {
      headline: 'Founder reality check',
      summary: 'This run leaned too hard on weak assumptions. The business probably moved, but it did not move with enough clarity, discipline, or customer signal.',
      points: [
        'Most low-score runs come from building before validating, adding complexity too early, or scaling a message before it is clear.',
        visitedDanger ? 'The danger route is your clearest clue: weak decisions compounded until the company started breaking.' : 'Even without a visible collapse, the run lacked enough strong moves to become durable.',
        `You only landed ${goodCount} strong choice${goodCount !== 1 ? 's' : ''}, so your next best move is fixing decision quality, not adding more effort.`
      ],
      tip: 'Start with customer validation. Use Discord, Reddit, or real niche communities to find people with the problem, then ask what happened the last time they faced it and what they tried before.'
    };
  }, [scorePercent, state.history, state.goldNodeResults, state.path]);

  const stats = useMemo(
    () => [
      { key: 'money', label: 'Money', value: state.money, raw: state.money },
      { key: 'marketing', label: 'Marketing', value: state.marketing, raw: state.marketing },
      { key: 'ip', label: 'IP', value: state.ip, raw: state.ip },
      { key: 'competition', label: 'Market Opportunity', value: state.competition, raw: state.competition },
      { key: 'customerService', label: 'Customer Service', value: state.customerService, raw: state.customerService },
    ],
    [state]
  );

  const startGame = () => {
    startSynthMusic();
    lockRef.current = false;
    setState({
      ...initialState,
      screen: 'game',
      startedAt: Date.now(),
      endedAt: null,
      upcomingPath: buildUpcomingPath('hobby'),
    });
    setFeedback('Choose a path and build your startup.');
    setRating(null);
    setSelectedChoice(null);
    setDeltaItems([]);
    setSelectedMinigame([]);
    setLastChoices([]);
    setLastSelectedChoice(null);
    setLastChoiceRatings({});
    setPendingDeltaMap({});
    setPendingNextState(null);
  };

  const restart = () => {
    stopSynthMusic();
    lockRef.current = false;
    setState(initialState);
    setFeedback('Fresh run. Try a different founder strategy.');
    setRating(null);
    setSelectedChoice(null);
    setDeltaItems([]);
    setSelectedMinigame([]);
    setLastChoices([]);
    setLastSelectedChoice(null);
    setLastChoiceRatings({});
    setPendingDeltaMap({});
    setPendingNextState(null);
  };

  const storeChoiceContext = (choiceList: Choice[], chosenLabel: string) => {
    setSelectedChoice(chosenLabel);
    setLastSelectedChoice(chosenLabel);
    setLastChoices(choiceList);
    setLastChoiceRatings(
      Object.fromEntries(choiceList.map((opt) => [opt.label, evaluateChoice(opt.effect)])) as Record<string, 'good' | 'ok' | 'bad'>
    );
  };

  const startValidationMinigame = (choice: Choice) => {
    if (!node) return;
    storeChoiceContext(node.choices, choice.label);
    setRating(evaluateChoice(choice.effect));
    setDeltaItems(getDeltaItems(choice.effect));
    setPendingDeltaMap({});
    setFeedback(choice.feedback + ' Scroll down to play the minigame.');
    setState((prev) => ({ ...prev, minigame: { ...validationMinigame, phase: 1, phase1Result: null } }));
    setSelectedMinigame([]);
    playTone('ok');
  };

  const startPitchMinigame = (choice: Choice) => {
    if (!node) return;
    storeChoiceContext(node.choices, choice.label);
    setRating(evaluateChoice(choice.effect));
    setDeltaItems(getDeltaItems(choice.effect));
    setPendingDeltaMap({});
    setFeedback(choice.feedback + ' Scroll down to play the minigame.');
    setState((prev) => ({ ...prev, minigame: pitchMinigame, pitchMarker: 10, pitchDirection: 1 }));
    setSelectedMinigame([]);
    playTone('ok');
  };

  const finishValidationMinigame = () => {
    const phase1Score = state.minigame?.phase1Result || 0;
    const phase2Score = selectedMinigame.filter((i) => validationMinigame.options[i].correct).length;
    const totalScore = phase1Score + phase2Score;

    let minigameRating: 'good' | 'ok' | 'bad' = 'bad';
    if (totalScore >= 5) minigameRating = 'good';
    else if (totalScore >= 3) minigameRating = 'ok';

    let explanation = 'User sourcing: ';
    if (phase1Score === 3) explanation += 'Excellent — you chose real target users who can speak from direct experience. ';
    else if (phase1Score === 2) explanation += 'Decent — but your sample is slightly biased, so the data is only somewhat trustworthy. ';
    else explanation += 'Weak — the people you chose are too biased or too far from the real user, so the feedback will mislead you. ';

    explanation += 'Questions: ';
    if (phase2Score === 3) explanation += 'Strong — you focused on actual behavior, pain, and previous attempts. That is how you uncover real demand.';
    else if (phase2Score === 2) explanation += 'Okay — you found some real insight, but a couple weak questions still invited politeness or hypotheticals.';
    else explanation += 'Poor — too many of your questions asked for guesses, compliments, or made-up future behavior instead of real evidence.';

    setRating(minigameRating);
    setFeedback(totalScore >= 3 ? explanation : `${explanation} Weak validation sent you into a recovery branch.`);
    setDeltaItems([
      {
        key: 'validation',
        label: 'Validation Skill',
        Icon: TrendingUp,
        display: totalScore >= 5 ? '+3' : totalScore >= 3 ? '+1' : '-1',
        tone: totalScore >= 3 ? 'good' : 'bad',
      },
    ]);
    setPendingDeltaMap({});
    playTone(minigameRating);

    const validationNextId = totalScore >= 3 ? validationMinigame.successNext : 'danger_validation_1';

    const nextStats: GameState = {
      ...state,
      unstableChoices: totalScore >= 3 ? 0 : state.unstableChoices + 1,
      dangerReturnId: validationMinigame.successNext,
      minigame: null,
      currentId: validationNextId,
      path: [...state.path, validationNextId],
      goldNodeResults: { ...state.goldNodeResults, idea: totalScore >= 3 ? 'hit' : 'miss' },
      history: [
        ...state.history,
        {
          stage: 'Validation Minigame',
          label: `Score ${totalScore}/6`,
          feedback: explanation,
          rating: minigameRating,
        },
      ],
    };

    setState({ ...nextStats, upcomingPath: buildUpcomingPath(validationNextId) });
    setSelectedChoice(null);
    setLastSelectedChoice(null);
    setLastChoices([]);
    setLastChoiceRatings({});
    setDeltaItems([]);
    setPendingDeltaMap({});
    setSelectedMinigame([]);
    setRating(null);
    setFeedback('Choose your next move.');
    setPendingNextState(null);
    lockRef.current = false;
  };

  const finishPitchMinigame = () => {
    const marker = state.pitchMarker;
    const perfect = marker >= 44 && marker <= 56;
   const decent = marker >= 34 && marker <= 66;
const minigameRating: 'good' | 'ok' | 'bad' = perfect ? 'good' : decent ? 'ok' : 'bad';

    let resultText = pitchMinigame.explanation;
    if (perfect) resultText += ' You landed the pitch sweet spot and sounded sharp, credible, and memorable.';
    else if (decent) resultText += ' You were close, but the pitch still leaned a little too vague or too technical.';
    else if (marker < 34) resultText += ' You stopped too early. The room heard passion, but not enough substance.';
    else resultText += ' You stopped too late. Half the audience is now spiritually trapped inside a datasheet.';

    setRating(minigameRating);
    setFeedback(resultText);
    setDeltaItems([    
	  {
        key: 'pitch',
        label: 'Pitch Skill',
        Icon: TrendingUp,
        display: perfect ? '+3' : decent ? '+1' : '-1',
        tone: perfect || decent ? 'good' : 'bad',
      },
    ]);
    setPendingDeltaMap({});
    playTone(minigameRating);

    const nextStats: GameState = {
      ...state,
      minigame: null,
      currentId: pitchMinigame.successNext,
      path: [...state.path, pitchMinigame.successNext],
      goldNodeResults: { ...state.goldNodeResults, pitch: decent || perfect ? 'hit' : 'miss' },
      history: [
        ...state.history,
        {
          stage: 'Pitch Minigame',
          label: `Stopped at ${Math.round(marker)}% on the pitch meter`,
          feedback: resultText,
          rating: minigameRating,
        },
      ],
    };

    setState({
      ...nextStats,
      upcomingPath: buildUpcomingPath(pitchMinigame.successNext),
    });
    setSelectedChoice(null);
    setLastSelectedChoice(null);
    setLastChoices([]);
    setLastChoiceRatings({});
    setDeltaItems([]);
    setPendingDeltaMap({});
    setSelectedMinigame([]);
    setRating(null);
    setFeedback('Choose your next move.');
    setPendingNextState(null);
    lockRef.current = false;
  };

  const advancePending = () => {
    if (!pendingNextState) return;
    setState(pendingNextState);
    setSelectedChoice(null);
    setLastSelectedChoice(null);
    setLastChoices([]);
    setLastChoiceRatings({});
    setDeltaItems([]);
    setPendingDeltaMap({});
    setRating(null);
    setFeedback('Choose your next move.');
    setPendingNextState(null);
    lockRef.current = false;
  };

  const choose = (choice: Choice) => {
    if (!node || lockRef.current || state.gameOver || pendingNextState) return;

    if (choice.next === 'MINIGAME_VALIDATION') {
      startValidationMinigame(choice);
      return;
    }

    if (choice.next === 'MINIGAME_PITCH') {
      startPitchMinigame(choice);
      return;
    }

    const goldNodeMissUpdates = { ...state.goldNodeResults };
    const resolvedNext = DANGER_NODES.has(state.currentId) && choice.next === 'business'
      ? state.dangerReturnId || 'business'
      : choice.next;
    if (state.currentId === 'idea') goldNodeMissUpdates.idea = 'miss';
    if (state.currentId === 'pitch') goldNodeMissUpdates.pitch = 'miss';

    lockRef.current = true;
    const choiceRating = evaluateChoice(choice.effect);
    const nextDeltaItems = getDeltaItems(choice.effect);

    storeChoiceContext(node.choices, choice.label);
    setRating(choiceRating);
    setDeltaItems(nextDeltaItems);
    setPendingDeltaMap(choice.effect);
    setFeedback(choice.feedback);
    playTone(choiceRating);

    const shouldAccumulateRisk = !DANGER_NODES.has(state.currentId) && !DANGER_NODES.has(resolvedNext) && state.currentId !== 'pitch';
    const nextUnstableChoices = choiceRating === 'good'
      ? 0
      : shouldAccumulateRisk
        ? state.unstableChoices + 1
        : state.unstableChoices;
    const triggerDangerFromChoices = shouldAccumulateRisk && nextUnstableChoices >= 2 && resolvedNext !== 'ending';
    const triggerImmediateFailureFromRepeatedDanger = triggerDangerFromChoices && state.path.includes('danger_validation_1');

    const nextStats: GameState = {
      ...state,
      unstableChoices: nextUnstableChoices,
      money: clamp(state.money + choice.effect.money),
      marketing: clamp(state.marketing + choice.effect.marketing),
      ip: clamp(state.ip + choice.effect.ip),
      competition: clamp(state.competition + choice.effect.competition),
      customerService: clamp(state.customerService + choice.effect.customerService),
      goldNodeResults: goldNodeMissUpdates,
      history: [...state.history, { stage: node.stage, label: choice.label, feedback: choice.feedback, rating: choiceRating }],
    };

    if (triggerImmediateFailureFromRepeatedDanger) {
      setPendingNextState({
        ...nextStats,
        upcomingPath: [],
        currentId: 'ending',
        path: [...state.path, 'ending'],
        gameOver: true,
        endedAt: Date.now(),
        win: false,
        founderType: computeFounderType(nextStats),
        endingTitle: 'Repeated Danger Collapse',
        endingReason: 'You hit the danger route a second time. The business did not recover from repeated weak decisions.',
      });
      return;
    }

    if (triggerDangerFromChoices) {
      setPendingNextState({
        ...nextStats,
        dangerReturnId: resolvedNext,
        currentId: 'danger_validation_1',
        upcomingPath: buildUpcomingPath('danger_validation_1'),
        path: [...state.path, 'danger_validation_1'],
      });
      return;
    }

    if (resolvedNext === 'ending') {
      const result = evaluateEnd(nextStats);
      setPendingNextState({
        ...nextStats,
        upcomingPath: [],
        currentId: 'ending',
        path: [...state.path, 'ending'],
        gameOver: true,
        endedAt: Date.now(),
        win: result.win,
        founderType: computeFounderType(nextStats),
        endingTitle: result.title,
        endingReason: result.reason,
      });
      return;
    }

    if (nextStats.money <= 0 || nextStats.customerService <= 0 || nextStats.competition >= 100) {
      const result = evaluateEnd(nextStats);
      setPendingNextState({
        ...nextStats,
        upcomingPath: [],
        currentId: 'ending',
        path: [...state.path, 'ending'],
        gameOver: true,
        endedAt: Date.now(),
        win: false,
        founderType: computeFounderType(nextStats),
        endingTitle: result.title,
        endingReason: result.reason,
      });
      return;
    }

    setPendingNextState({
      ...nextStats,
      currentId: resolvedNext,
      upcomingPath: buildUpcomingPath(resolvedNext),
      path: [...state.path, resolvedNext],
    });
  };

  const currentRatingStyle = rating ? ratingStyles[rating] : null;

  if (state.screen === 'intro') {
    return (
      <div className="min-h-screen bg-black text-white p-4 md:p-8 font-mono bg-[#050816] bg-[radial-gradient(circle_at_top,_rgba(0,255,255,0.08),_transparent_35%),linear-gradient(180deg,_#070b1f_0%,_#03050f_100%)]">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="rounded-none border-2 border-cyan-400 bg-[#0b0f2a] p-8 shadow-[0_0_0_3px_rgba(0,255,255,0.12),8px_8px_0_0_rgba(0,180,255,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-black tracking-[0.08em] uppercase text-cyan-300">Startup Simulator</h1>
                <p className="mt-2 text-cyan-100/90 tracking-wide">Founder route: Guitar Pedal Startup</p>
              </div>
              <Badge variant="outline" className="rounded-none border-2 border-cyan-300 bg-[#0f1738] px-3 py-1 text-cyan-200 shadow-[3px_3px_0_0_rgba(255,255,0,0.25)]">Solo Founder Mode</Badge>
            </div>
            <div className="mt-8 rounded-none border-2 border-cyan-400/70 bg-[#111633] p-6 space-y-4 shadow-[6px_6px_0_0_rgba(0,180,255,0.12)]">
              <p className="text-lg leading-8 text-white">
                You are a solo founder of a brand new type of guitar pedal that recreates the tone of any song with the click of a button: <span className="font-semibold">OnlyPedal</span>.
              </p>
              <p className="text-cyan-100/85 leading-7">
                Your goal is to go from idea to exit without blowing up the company. Make strong decisions, hit key minigames, and manage the tradeoffs of building a startup.
              </p>
              <p className="text-cyan-100/85 leading-7">
                Want extra replay value? Try to become the <span className="font-semibold">13th person to get the worst score</span> to earn a one-on-one with the founders.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={startGame} className="rounded-none border-2 border-cyan-300 bg-cyan-400 text-[#07111f] px-6 uppercase tracking-wider shadow-[4px_4px_0_0_rgba(0,180,255,0.22)] hover:bg-cyan-300">Start Game</Button>
              <Button variant="outline" className="rounded-none border-2 border-yellow-300 bg-[#2a2430] text-yellow-200 uppercase tracking-wider shadow-[4px_4px_0_0_rgba(255,255,0,0.14)]">Worst Startup Mode (soon)</Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <StartupModeCard title="Guitar Pedal Startup" subtitle="Available now — build OnlyPedal from idea to exit." onClick={startGame} />
            <StartupModeCard title="Lawn Care Startup" subtitle="Locked until you complete the guitar pedal route." locked />
            <StartupModeCard title="Dropshipping Startup" subtitle="Locked until you complete the guitar pedal route." locked />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-mono bg-[#050816] bg-[radial-gradient(circle_at_top,_rgba(0,255,255,0.08),_transparent_35%),linear-gradient(180deg,_#070b1f_0%,_#03050f_100%)]">
      <div className="mx-auto max-w-6xl grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Startup Simulator</h1>
              <p className="text-sm text-white">A choose-your-own-adventure founder game.</p>
            </div>
            <div className="flex items-center gap-4 flex-wrap justify-end">
  <div className="flex items-center gap-2 rounded-2xl border border-cyan-400/35 bg-[#0b0f2a] px-3 py-2 text-sm font-medium text-cyan-100/85">
    <span className="text-xs uppercase tracking-wider text-cyan-300">Music</span>
    <input
      type="range"
      min="0"
      max="100"
      value={musicVolume}
      onChange={(e) => setMusicVolume(Number(e.target.value))}
      className="w-28 accent-cyan-300"
    />
    <span className="w-8 text-right text-xs text-white">{musicVolume}</span>
  </div>
  <Button
                variant="outline"
                onClick={restart}
                className="rounded-2xl text-white border-cyan-400/50 bg-[#0b0f2a] hover:bg-[#111633]"
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Restart
              </Button>
          </div>
        </div>

          <Card className="rounded-none border-2 border-cyan-400 bg-[#0b0f2a] text-white shadow-[6px_6px_0_0_rgba(0,180,255,0.14)]">
            <CardHeader className="text-white border-b border-cyan-400/30 bg-[#0d1330]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full border-cyan-400/50 bg-[#111633] px-3 py-1 text-white">{state.gameOver ? 'Run Complete' : node?.stage || 'Minigame'}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-white">
              {!state.gameOver ? (
                <>
                  <div className="rounded-none bg-[#111633] border-2 border-cyan-400/40 p-6 shadow-[4px_4px_0_0_rgba(255,255,0,0.08)]">
                    <p className="text-lg leading-8 text-white">{node?.text}</p>
                  </div>

                  <div className="grid gap-3">
                    {shuffledChoices.map((choice) => {
                      const isSelected = selectedChoice === choice.label;
                      const hasPicked = !!lastSelectedChoice;
                      const optionRating = lastChoiceRatings[choice.label] || evaluateChoice(choice.effect);
                      const optionStyles = ratingStyles[optionRating];
                      const highlightClass = isSelected && rating ? ratingStyles[rating].button : 'border-cyan-400/35';

                      if (hasPicked) {
                        return (
                          <div
                            key={choice.label}
                            className={`rounded-none border-2 px-5 py-4 ${isSelected ? highlightClass : 'border-cyan-400/35 bg-[#0b0f2a]/70'}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="pr-4 text-sm md:text-base font-medium">{choice.label}</div>
                              <div className="flex items-center gap-2">
                                <Badge className={`rounded-none border-2 px-3 py-1 uppercase tracking-wider ${optionStyles.pill}`}>
                                  {optionStyles.label}
                                </Badge>
                                <span className={`text-[10px] uppercase tracking-wide ${isSelected ? 'text-cyan-300' : 'text-cyan-100/85'}`}>
                                  {isSelected ? 'Chosen' : 'Not chosen'}
                                </span>
                              </div>
                            </div>
                            <p className={`mt-3 text-sm leading-6 ${optionStyles.text}`}>
                              {choice.feedback}
                            </p>
                            <div className="mt-4">
                              <div className="text-sm font-medium text-cyan-100/85 mb-2">Stat changes</div>
                              <div className="flex flex-wrap gap-2">
                                {getDeltaItems(choice.effect).length === 0 ? (
                                  <span className="text-sm text-cyan-100/85">No changes.</span>
                                ) : (
                                  getDeltaItems(choice.effect).map((item) => {
                                    const Icon = item.Icon;
                                    return (
                                      <div
                                        key={`${choice.label}-${item.key}-${item.display}`}
                                        className={`inline-flex items-center gap-2 rounded-none border-2 px-3 py-1 uppercase tracking-wider text-sm ${item.tone === 'good' ? 'border-green-300 bg-[#123524] text-green-300' : 'border-red-300 bg-[#35161d] text-red-300'}`}
                                      >
                                        <Icon className="h-4 w-4" />
                                        <span>{item.label}</span>
                                        <span className="font-semibold">{item.display}</span>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <>
                                <div className="mt-4 flex justify-end">
                                  <Button onClick={advancePending} className="rounded-2xl">
                                    {pendingNextState?.gameOver ? 'See Result' : 'Next Question'}
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      }

                      return (
                        <Button
                          key={choice.label}
                          variant="outline"
                          disabled={lockRef.current || !!pendingNextState}
                          className={`h-auto justify-between rounded-none border-2 border-cyan-400/50 bg-[#111633] px-5 py-4 text-left whitespace-normal text-cyan-100 hover:bg-[#161d45] hover:text-white transition-all duration-200 shadow-[4px_4px_0_0_rgba(0,180,255,0.1)] ${highlightClass}`}
                          onClick={() => choose(choice)}
                        >
                          <span className="pr-4 text-sm md:text-base">{choice.label}</span>
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        </Button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="rounded-3xl border border-cyan-400/35 bg-[#0b0f2a] p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    {state.win ? (
                      <div className="flex items-center gap-1">
                        <Crown className="h-6 w-6 text-yellow-500" />
                        <Trophy className="h-7 w-7" />
                      </div>
                    ) : (
                      <Skull className="h-7 w-7" />
                    )}
                    <h2 className="text-2xl font-semibold">{state.endingTitle || (state.win ? 'Startup Survived' : 'Startup Failed')}</h2>
                  </div>
                  <p className="text-cyan-100/85 leading-7">{state.endingReason}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="rounded-2xl bg-[#0b0f2a] p-4">
                      <div className="text-sm text-cyan-100/85">Founder Type</div>
                      <div className="text-lg font-semibold">{state.founderType}</div>
                    </div>
                    <div className="rounded-2xl bg-[#0b0f2a] p-4">
                      <div className="text-sm text-cyan-100/85">Outcome</div>
                      <div className="text-lg font-semibold">{state.win ? 'Strong run' : 'Collapsed run'}</div>
                    </div>
                    <div className="rounded-2xl bg-[#0b0f2a] p-4">
                      <div className="text-sm text-cyan-100/85">Time Played</div>
                      <div className="text-lg font-semibold">{formatPlayTime(playTimeMs)}</div>
                    </div>
                  </div>
                  
                  <div className="rounded-2xl border border-cyan-400/35 bg-[#111633] p-4 space-y-3">
                    <div className="text-lg font-semibold">Founder Breakdown</div>
                    <p className="text-sm text-cyan-100/85">You scored <span className="font-bold">{scorePercent}%</span> based on strong main decisions.</p>
                    <p className="text-sm text-white font-medium">{founderBreakdown.headline}</p>
                    <p className="text-sm text-white">{founderBreakdown.summary}</p>
                    <div className="space-y-2">
                      {founderBreakdown.points.map((point, i) => (
                        <p key={i} className="text-sm text-cyan-100/85">• {point}</p>
                      ))}
                    </div>
                    <p className="text-sm text-white"><span className="font-semibold">Tip:</span> {founderBreakdown.tip}</p>
                    <p className="text-sm text-green-400 font-semibold">DM your ending screenshot on Instagram (@startup_simulator) for a 1-on-1 founder breakdown and mentorship call.</p>
                  </div>
                  <Button onClick={restart} className="rounded-2xl text-white border-cyan-400/50 bg-[#0b0f2a] hover:bg-[#111633]">Play Again</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-none border-2 border-cyan-400 bg-[#0b0f2a] text-white shadow-[6px_6px_0_0_rgba(0,180,255,0.14)]">
            <CardHeader className="text-white border-b border-cyan-400/30 bg-[#0d1330]">
              <CardTitle className="text-lg uppercase tracking-[0.08em] text-cyan-300">Path</CardTitle>
            </CardHeader>
            <CardContent className="text-white">
              <div className="flex items-center gap-3 flex-wrap">
                {state.path.map((id, idx) => {
                  const isCurrent = idx === state.path.length - 1;
                  const currentType = GOLD_NODES.has(id) ? 'gold' : DANGER_NODES.has(id) ? 'danger' : 'blue';
                  return (
                    <React.Fragment key={`${id}-${idx}`}>
                      <div className="flex items-center gap-2">
                        <NodeDot type={currentType} active={isCurrent} result={state.goldNodeResults[id]} />
                      </div>
                      {idx < state.path.length - 1 && <div className="w-6 h-0.5 bg-cyan-400/40" />}
                    </React.Fragment>
                  );
                })}
              </div>
              <p className="text-xs text-cyan-100/85 mt-2">Blue = main track. Gold = success or minigame route. Red = danger route.</p>

              {node?.choices && node.choices.length > 0 && (
                <div className="mt-5 pl-[6px]">
                  <div className="flex items-start gap-6 flex-wrap">
                    {node.choices.map((choice, i) => {
                      const choiceRating = evaluateChoice(choice.effect);
                      const nextId = String(choice.next).startsWith('MINIGAME_')
                        ? (choice.next === 'MINIGAME_VALIDATION' ? validationMinigame.successNext : pitchMinigame.successNext)
                        : choice.next;

                      const branchType = nextId === 'ending'
                        ? 'danger'
                        : GOLD_NODES.has(nextId)
                          ? 'gold'
                          : DANGER_NODES.has(nextId)
                            ? 'danger'
                            : choiceRating === 'good'
                              ? 'gold'
                              : choiceRating === 'bad'
                                ? 'danger'
                                : 'blue';

                      const branchLabel = branchType === 'danger'
                        ? 'Danger'
                        : branchType === 'gold'
                          ? 'Success / Minigame'
                          : 'Risky / Return';

                      const pillarColor = branchType === 'danger'
                        ? 'bg-pink-400'
                        : branchType === 'gold'
                          ? 'bg-green-500'
                          : 'bg-yellow-300';

                      return (
                        <div key={`branch-${i}`} className="flex flex-col items-center min-w-[110px]">
                          <div className={`w-14 h-3 rounded-sm ${pillarColor}`} />
                          <div className="h-5 w-0.5 bg-cyan-400/40" />
                          <div className="w-4 h-4 border-2 border-zinc-500 bg-black" />
                          <div className="mt-2 text-[11px] font-medium text-cyan-100/85 text-center">{branchLabel}</div>
                          <div className="text-[10px] text-cyan-100/85 text-center max-w-[120px] mt-1">
                            {nodes[nextId]?.stage || (nextId === 'ending' ? 'Ending' : 'Next')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-cyan-100/85 mt-3">The current node branches outward by outcome instead of previewing hidden nodes ahead.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {state.minigame && (
            <div ref={minigameRef}>
              <Card className="rounded-none border-2 border-cyan-400 bg-[#0b0f2a] text-white shadow-[6px_6px_0_0_rgba(0,180,255,0.14)]">
                <CardHeader className="text-white border-b border-cyan-400/30 bg-[#0d1330]">
                  <CardTitle className="text-lg uppercase tracking-[0.08em] text-cyan-300">Key Decision Minigame</CardTitle>
                </CardHeader>
                <CardContent className="text-white">
                  <div className="rounded-2xl bg-[#0b0f2a] border border-cyan-400/35 p-4 space-y-2">
                    <p className="font-semibold text-white">
                      {state.minigame.type === 'validation' && state.minigame.phase === 2
                        ? state.minigame.questionPhase2
                        : state.minigame.question}
                    </p>
                    <p className="text-sm text-white">
                      {state.minigame.type === 'validation' && state.minigame.phase === 2
                        ? state.minigame.helperPhase2
                        : state.minigame.helper}
                    </p>
                  </div>

                  {state.minigame.type === 'validation' && (
                    <>
                      {state.minigame.phase === 1 ? (
                        <>
                          <div className="grid gap-2">
                            {state.minigame.optionsPhase1?.map((opt, i) => (
                              <Button
                                key={i}
                                variant="outline"
                                className={`justify-start rounded-2xl h-auto whitespace-normal px-4 py-3 text-left text-white transition-all duration-150 ${selectedMinigame.includes(i) ? 'border-blue-400 bg-[#111633] ring-2 ring-cyan-300' : 'border-cyan-400/35 bg-[#0b0f2a] hover:bg-[#111633]'} hover:text-white`}
                                onClick={() => {
                                  if (selectedMinigame.includes(i)) setSelectedMinigame(selectedMinigame.filter((x) => x !== i));
                                  else if (selectedMinigame.length < 3) setSelectedMinigame([...selectedMinigame, i]);
                                }}
                              >
                                {opt.text}
                              </Button>
                            ))}
                          </div>
                          <div className="flex justify-between gap-3">
                            <div className="text-sm text-cyan-100/85">Selected {selectedMinigame.length}/3</div>
                            <Button
                              disabled={selectedMinigame.length !== 3}
                              onClick={() => {
                                const correctPhase1 = selectedMinigame.filter((i) => validationMinigame.optionsPhase1[i].correct).length;
                                let phase1Feedback = '';
                                if (correctPhase1 === 3) phase1Feedback = 'Excellent sourcing. You found people who actually resemble the real buyer.';
                                else if (correctPhase1 === 2) phase1Feedback = 'Decent sourcing, but your sample is slightly biased.';
                                else phase1Feedback = 'Weak sourcing. You are mostly collecting polite or misleading feedback.';
                                setFeedback(phase1Feedback);
                                setRating(correctPhase1 === 3 ? 'good' : correctPhase1 === 2 ? 'ok' : 'bad');
                                setSelectedMinigame([]);
                                setState((prev) => ({
                                  ...prev,
                                  minigame: { ...prev.minigame!, phase: 2, phase1Result: correctPhase1 },
                                }));
                              }}
                              className="rounded-2xl"
                            >
                              Next
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid gap-2">
                            {state.minigame.options?.map((opt, i) => (
                              <Button
                                key={i}
                                variant="outline"
                                className={`justify-start rounded-2xl h-auto whitespace-normal px-4 py-3 text-left text-white transition-all duration-150 ${selectedMinigame.includes(i) ? 'border-blue-400 bg-[#111633] ring-2 ring-cyan-300' : 'border-cyan-400/35 bg-[#0b0f2a] hover:bg-[#111633]'} hover:text-white`}
                                onClick={() => {
                                  if (selectedMinigame.includes(i)) setSelectedMinigame(selectedMinigame.filter((x) => x !== i));
                                  else if (selectedMinigame.length < 3) setSelectedMinigame([...selectedMinigame, i]);
                                }}
                              >
                                {opt.text}
                              </Button>
                            ))}
                          </div>
                          <div className="flex justify-between gap-3">
                            <div className="text-sm text-cyan-100/85">Selected {selectedMinigame.length}/3</div>
                            <Button onClick={finishValidationMinigame} disabled={selectedMinigame.length !== 3} className="rounded-2xl">
                              Submit
                            </Button>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {state.minigame.type === 'pitch' && (
                    <>
                      <div className="rounded-2xl border border-cyan-400/35 bg-[#0b0f2a] p-4 space-y-3">
                        <div className="relative h-10 rounded-xl border-2 border-cyan-400/35 overflow-hidden bg-[#111633]">
                          <div className="absolute inset-y-0 left-[0%] w-[34%] bg-[#35161d]" />
                          <div className="absolute inset-y-0 left-[34%] w-[32%] bg-[#123524]" />
                          <div className="absolute inset-y-0 right-[0%] w-[34%] bg-[#35161d]" />
                          <div className="absolute top-0 bottom-0 w-3 bg-zinc-100" style={{ left: `calc(${state.pitchMarker}% - 6px)` }} />
                        </div>
                        <div className="flex justify-between text-xs text-cyan-100/85">
                          <span>Too vague</span>
                          <span>Sweet spot</span>
                          <span>Too technical</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-cyan-100/85">Stop the meter in the green zone.</div>
                        <Button onClick={finishPitchMinigame} className="rounded-2xl">
                          Stop Pitch
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card className="rounded-none border-2 border-cyan-400 bg-[#0b0f2a] text-white shadow-[6px_6px_0_0_rgba(0,180,255,0.14)]">
            <CardHeader className="text-white border-b border-cyan-400/30 bg-[#0d1330]">
              <CardTitle className="text-lg uppercase tracking-[0.08em] text-cyan-300">Business Stats</CardTitle>
            </CardHeader>
            <CardContent className="text-white">
              {stats.map((s) => {
                const tone = getStatTone(s.key, s.raw);
                const toneClasses = statToneClasses[tone as keyof typeof statToneClasses];
                const pendingDelta = pendingDeltaMap[s.key] || 0;
                return (
                  <div
                    key={s.key}
                    className={`space-y-2 rounded-2xl border p-3 transition-opacity duration-300 ${toneClasses.chip} ${pendingDelta !== 0 ? 'opacity-70' : 'opacity-100'}`}
                  >
                    <div className="flex justify-between text-sm">
                      <span className={`${toneClasses.text} font-medium`}>{s.label}</span>
                      <span className={`font-semibold ${toneClasses.text}`}>
                        {s.value}
                        {pendingDelta !== 0 && <span className="ml-2 text-xs opacity-80">({pendingDelta > 0 ? '+' : ''}{pendingDelta})</span>}
                      </span>
                    </div>
                    <Progress value={s.value} className={`h-2 ${toneClasses.bar}`} />
                  </div>
                );
              })}
              <p className="text-xs leading-5 text-cyan-100/85">
                Higher market opportunity is better. The other stats should rise without destabilizing the business.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
