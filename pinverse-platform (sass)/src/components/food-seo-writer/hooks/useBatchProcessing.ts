import { useState, useCallback, useEffect, useRef } from "react";
import type { FormInputs, PipelineResult, ProviderSettings } from "../types";
import { useContentGeneration } from "./useContentGeneration";

export interface BatchItem {
  keyword: string;
  status: "pending" | "processing" | "completed" | "error";
  result?: PipelineResult;
  error?: string;
}

const STORAGE_KEY = "food-seo-writer-batch-state";

export function useBatchProcessing() {
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(-1);
  const [batchError, setBatchError] = useState<string | null>(null);

  const [sharedInputs, setSharedInputs] = useState<FormInputs | null>(null);
  const [sharedProvider, setSharedProvider] = useState<ProviderSettings | null>(null);

  // Ref to signal abort to the async loop
  const abortRef = useRef(false);
  // Ref to prevent double-starting the loop
  const loopRunningRef = useRef(false);

  const {
    progress,
    result,
    generating,
    generate,
    reset,
    abort,
    fixing,
    fixIssues,
  } = useContentGeneration();

  // --- Load from local storage on mount ---
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.batchItems && parsed.batchItems.length > 0) {
          // BUG FIX 2: Reset any "processing" items back to "pending"
          // so they can be retried when the user clicks Resume
          const recoveredItems: BatchItem[] = parsed.batchItems.map((item: BatchItem) =>
            item.status === "processing"
              ? { ...item, status: "pending" as const, error: undefined }
              : item
          );
          setBatchItems(recoveredItems);

          // Find the first non-completed item index for resume
          const firstPendingIdx = recoveredItems.findIndex(
            (item: BatchItem) => item.status === "pending" || item.status === "error"
          );
          setCurrentBatchIndex(firstPendingIdx >= 0 ? firstPendingIdx : -1);

          setSharedInputs(parsed.sharedInputs ?? null);
          setSharedProvider(parsed.sharedProvider ?? null);
          setIsBatchProcessing(false); // Start paused — user clicks Resume
        }
      }
    } catch (e) {
      console.error("Error loading batch state from local storage", e);
    }
  }, []);

  // --- Save to local storage on change ---
  useEffect(() => {
    if (batchItems.length > 0) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            batchItems,
            currentBatchIndex,
            sharedInputs,
            sharedProvider,
          })
        );
      } catch (e) {
        console.error("Error saving batch state", e);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [batchItems, currentBatchIndex, sharedInputs, sharedProvider]);

  // --- Core async processing loop ---
  // BUG FIX 1 & 3: Replaced the fragile useEffect-based loop with an explicit
  // async function that calls generate() directly and uses its return value.
  // This eliminates all race conditions between progress/generating/result states.
  const runBatchLoop = useCallback(
    async (items: BatchItem[], startIdx: number, inputs: FormInputs, provider: ProviderSettings) => {
      if (loopRunningRef.current) return;
      loopRunningRef.current = true;
      abortRef.current = false;

      for (let i = startIdx; i < items.length; i++) {
        if (abortRef.current) break;

        const item = items[i];
        // Skip completed items
        if (item.status === "completed") continue;

        // Mark as processing
        setCurrentBatchIndex(i);
        setBatchItems(prev =>
          prev.map((it, idx) =>
            idx === i ? { ...it, status: "processing" as const, error: undefined } : it
          )
        );

        // Reset generation hook state before each keyword
        reset();

        // Build inputs for this keyword (Correction 6: retain all settings)
        const batchInputs: FormInputs = {
          ...inputs,
          core: { ...inputs.core, mainKeyword: item.keyword },
        };

        try {
          // generate() now returns PipelineResult | null directly
          const pipelineResult = await generate(batchInputs, provider, { isBatchMode: true });

          // Add a 5s delay before the next item to allow API rate limits to recover
          if (pipelineResult && i < items.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }

          if (abortRef.current) break;

          if (pipelineResult) {
            // Success — update this item
            setBatchItems(prev =>
              prev.map((it, idx) =>
                idx === i ? { ...it, status: "completed" as const, result: pipelineResult } : it
              )
            );
          } else {
            // null means abort or error with no result
            setBatchItems(prev =>
              prev.map((it, idx) =>
                idx === i ? { ...it, status: "error" as const, error: "Generation returned no result" } : it
              )
            );
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Unknown error";
          setBatchItems(prev =>
            prev.map((it, idx) =>
              idx === i ? { ...it, status: "error" as const, error: errMsg } : it
            )
          );
          // Continue to next item — don't abort entire batch on single failure
        }
      }

      // Batch loop finished
      loopRunningRef.current = false;
      setIsBatchProcessing(false);
      setCurrentBatchIndex(-1);
    },
    [generate, reset]
  );

  const startBatch = useCallback(
    async (inputs: FormInputs, provider: ProviderSettings) => {
      if (!inputs.batch.keywords || inputs.batch.keywords.length === 0) {
        setBatchError("No keywords provided for batch processing.");
        return;
      }

      const newItems: BatchItem[] = inputs.batch.keywords.map(kw => ({
        keyword: kw,
        status: "pending" as const,
      }));

      setSharedInputs(inputs);
      setSharedProvider(provider);
      setIsBatchProcessing(true);
      setBatchError(null);
      setBatchItems(newItems);
      setCurrentBatchIndex(0);
      reset();

      // Start the async loop
      // Use setTimeout(0) to let React commit the state updates first
      setTimeout(() => {
        runBatchLoop(newItems, 0, inputs, provider);
      }, 50);
    },
    [reset, runBatchLoop]
  );

  const stopBatch = useCallback(() => {
    abortRef.current = true;
    loopRunningRef.current = false;
    setIsBatchProcessing(false);
    abort();
  }, [abort]);

  const resumeBatch = useCallback(() => {
    if (batchItems.length === 0 || !sharedInputs || !sharedProvider) return;

    // Reset any stuck "processing" items to "pending"
    const fixedItems = batchItems.map(item =>
      item.status === "processing"
        ? { ...item, status: "pending" as const, error: undefined }
        : item
    );

    // Find the first pending item
    const nextIdx = fixedItems.findIndex(
      item => item.status === "pending" || item.status === "error"
    );
    if (nextIdx < 0) return; // All done

    setBatchItems(fixedItems);
    setIsBatchProcessing(true);
    setCurrentBatchIndex(nextIdx);
    reset();

    setTimeout(() => {
      runBatchLoop(fixedItems, nextIdx, sharedInputs, sharedProvider);
    }, 50);
  }, [batchItems, sharedInputs, sharedProvider, reset, runBatchLoop]);

  const clearBatch = useCallback(() => {
    stopBatch();
    setBatchItems([]);
    setCurrentBatchIndex(-1);
    setSharedInputs(null);
    setSharedProvider(null);
    localStorage.removeItem(STORAGE_KEY);
  }, [stopBatch]);

  return {
    batchItems,
    setBatchItems,
    isBatchProcessing,
    currentBatchIndex,
    setCurrentBatchIndex,
    batchError,
    startBatch,
    stopBatch,
    resumeBatch,
    clearBatch,
    internalGeneration: { progress, result, generating, generate, reset, abort, fixing, fixIssues },
  };
}
