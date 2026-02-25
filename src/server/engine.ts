// written with LLM support

import crypto from "node:crypto";
import {SENTENCES} from "@/src/const/sentences";


const ROUND_MS = 30_000;

type Player = {
    socketId: string;
    playerId: string;
    name: string;
    typed: string;
    wpm: number;
    acc: number;
};

type Round = {
    roundId: string;
    sentence: string;
    startedAt: number;
    endsAt: number;
    serverNow: number;
};

const computeAcc = (sentence: string, typed: string) => {
    if (typed.length === 0) return 1;
    let correct = 0;
    const n = Math.min(sentence.length, typed.length);
    for (let i = 0; i < n; i++) if (typed[i] === sentence[i]) correct++;
    return correct / typed.length;
};

const computeCorrectWords = (sentence: string, typed: string) => {
    const upTo = Math.min(sentence.length, typed.length);
    const t = typed.slice(0, upTo);

    let correctWords = 0;
    let start = 0;

    for (let i = 0; i <= t.length; i++) {
        const isEnd = i === t.length;
        if (isEnd || t[i] === " ") {
            if (i > start) {
                if (t.slice(start, i) === sentence.slice(start, i)) correctWords++;
            }
            start = i + 1;
        }
    }

    return correctWords;
};

const computeWpm = (correctWords: number, startedAt: number, now: number) => {
    const elapsedMs = Math.max(now - startedAt, 1000);
    return correctWords / (elapsedMs / 60000);
};

export const createEngine = () => {
    const players = new Map<string, Player>();

    let sentenceIdx = 0;
    let roundId = crypto.randomUUID();
    let sentence = SENTENCES[sentenceIdx++ % SENTENCES.length]!;
    let startedAt = Date.now();
    let endsAt = startedAt + ROUND_MS;

    const startRound = () => {
        roundId = crypto.randomUUID();
        sentence = SENTENCES[sentenceIdx++ % SENTENCES.length]!;
        startedAt = Date.now();
        endsAt = startedAt + ROUND_MS;

        for (const p of players.values()) {
            p.typed = "";
            p.wpm = 0;
            p.acc = 1;
        }
    };

    const tick = (): boolean => {
        if (Date.now() >= endsAt) {
            startRound();
            return true;
        }
        return false;
    };

    const getRound = (): Round => ({
        roundId,
        sentence,
        startedAt,
        endsAt,
        serverNow: Date.now(),
    });

    const join = (socketId: string, name: string, playerId?: string) => {
        const id = playerId || crypto.randomUUID();

        players.set(socketId, {
            socketId,
            playerId: id,
            name: (name || "anon").slice(0, 24),
            typed: "",
            wpm: 0,
            acc: 1,
        });

        return { playerId: id };
    };

    const leave = (socketId: string) => {
        players.delete(socketId);
    };

    const progress = (socketId: string, typed: string) => {
        const p = players.get(socketId);
        if (!p) return;

        p.typed = typed;

        const acc = computeAcc(sentence, typed);
        const correctWords = computeCorrectWords(sentence, typed);
        const wpm = computeWpm(correctWords, startedAt, Date.now());

        p.acc = acc;
        p.wpm = wpm;
    };

    const getPlayers = () =>
        [...players.values()].map((p) => ({
            playerId: p.playerId,
            name: p.name,
            typedPreview: p.typed.slice(0, 28),
            wpm: p.wpm,
            acc: p.acc,
        }));

    return { tick, getRound, join, leave, progress, getPlayers };
};