"use client";

import {socket} from "@/src/client/socket";
import {useEffect, useState} from "react";

import styles from './page.module.css'


type Round = {
  roundId: string;
  sentence: string;
  starts: number;
  ends: number;
  serverNow: number
  };

  type Row = {
  playerId: string;
  name: string;
  typedSentence: string;
  wpm: number ;
  acc: number ;
  }

export default function Home() {
  const [round, setRound] = useState<Round | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [typed, setTyped] = useState("");


  useEffect(() => {
    socket.on("round", (r: Round) => {
      setRound(r);
      setTyped("");
    });
    socket.on("players", (p: { players: Row[] }) => setRows(p.players));

    return () => {
      socket.off("round");
      socket.off("players");
    };
  }, []);

  useEffect(() => {
    if (!joined) return;
    socket.emit("progress", { typed });
  }, [typed, joined]);

  const onJoin = () => {
    const playerId = localStorage.getItem("playerId") || undefined;
    socket.emit("join", { name: name.trim() || "anon", playerId }, (res: any) => {
      if (res?.playerId) localStorage.setItem("playerId", res.playerId);
    });
    setJoined(true);
  }
  return (
<div className={styles.container}>
  <main>
       <h1>Tonik Challange</h1>
      <p><b>Sentence:</b> {round?.sentence ?? "Loading ..."} </p>

    <div className={styles.wrapper}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nickaneme" />
      <button onClick={onJoin} className={styles.button}>Join</button>
    </div>

    <input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        disabled={!joined}
        placeholder={joined ? "type..." : "Join first"}
        className={styles.typeInput}
     />

    <table>
      <thead>
      <tr>
        <th className={styles.th}>Progress</th>
        <th className={styles.th}>Player</th>
        <th className={styles.th}>Words Per Minute</th>
        <th className={styles.th}>Accuracy</th>

      </tr>
      </thead>
      <tbody>
      {rows.map((row) => (
          <tr key={row.playerId}>
            <td className={styles.td}>{row.typedSentence}</td>
            <td className={styles.td}>{row.name}</td>
            <td className={styles.td}>{row.wpm.toFixed(1)}</td>
            <td className={styles.td}>{(row.acc*100).toFixed(0)}</td>
          </tr>
      ))}
      </tbody>
    </table>
  </main>
</div>
  );
}
