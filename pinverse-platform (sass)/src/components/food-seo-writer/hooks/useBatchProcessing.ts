import { useState, useCallback, useEffect } from "react";
import type { FormInputs, PipelineResult, ProviderSettings } from "../types";
import { useContentGeneration } from "./useContentGeneration";

export interface BatchItem {
  keyword: string;
  status: "pending" | "processing" | "completed" | "error";
  result?: PipelineResult;
  error?: string;
}

export function useBatchProcessing() {
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(-1);
  const [batchError, setBatchError] = useState<string | null>(null);

  const [sharedInputs, setSharedInputs] = useState<FormInputs | null>(null);
  const [sharedProvider, setSharedProvider] = useState<ProviderSettings | null>(null);

  // We instantiate a generation hook to run internally per keyword
  const {
    progress,
    result,
    generating,
    generate,
    reset,
    abort,
    fixing,
    fixIssues
  } = useContentGeneration();

  const startBatch = useCallback(async (
    inputs: FormInputs,
    provider: ProviderSettings
  ) => {
    if (!inputs.batch.keywords || inputs.batch.keywords.length === 0) {
      setBatchError("No keywords provided for batch processing.");
      return;
    }

    setSharedInputs(inputs);
    setSharedProvider(provider);
    setIsBatchProcessing(true);
    setBatchError(null);
    setBatchItems(inputs.batch.keywords.map(kw => ({ keyword: kw, status: "pending" })));
    setCurrentBatchIndex(0);
    reset(); // start fresh

  }, [reset]);

  const stopBatch = useCallback(() => {
    setIsBatchProcessing(false);
    abort();
  }, [abort]);

  // The effect hook that drives the sequence
  useEffect(() => {
    if (!isBatchProcessing || currentBatchIndex < 0 || currentBatchIndex >= batchItems.length) return;
    if (!sharedInputs || !sharedProvider) return;

    const currentItem = batchItems[currentBatchIndex];

    // If item is pending and generation is idle, start it
    if (currentItem.status === "pending" && !generating && progress.currentStage === "input") {
      setBatchItems(prev => prev.map((it, i) => i === currentBatchIndex ? { ...it, status: "processing" } : it));
      
      // Correction 6: retain all settings, only change mainKeyword
      const batchInputs = { ...sharedInputs, core: { ...sharedInputs.core, mainKeyword: currentItem.keyword } };
      generate(batchInputs, sharedProvider);
    } 
    // If generation just finished while we are processing this item
    else if (currentItem.status === "processing" && !generating) {
      if (progress.stages[progress.currentStage] === "error" || progress.error) {
        setBatchItems(prev => prev.map((it, i) => i === currentBatchIndex ? { ...it, status: "error", error: progress.error } : it));
        // We can either abort batch or continue. Let's continue to the next one to be resilient.
        if (currentBatchIndex < batchItems.length - 1) {
          reset();
          setCurrentBatchIndex(currentBatchIndex + 1);
        } else {
          setIsBatchProcessing(false);
          setCurrentBatchIndex(-1);
        }
      } else if (result) {
        setBatchItems(prev => prev.map((it, i) => i === currentBatchIndex ? { ...it, status: "completed", result } : it));
        
        // Move to next item
        if (currentBatchIndex < batchItems.length - 1) {
          reset();
          setCurrentBatchIndex(currentBatchIndex + 1);
        } else {
          // Batch fully done
          setIsBatchProcessing(false);
          setCurrentBatchIndex(-1);
        }
      }
    }
  }, [isBatchProcessing, currentBatchIndex, batchItems, generating, progress, result, sharedInputs, sharedProvider, generate, reset]);

  return {
    batchItems,
    setBatchItems,
    isBatchProcessing,
    currentBatchIndex,
    setCurrentBatchIndex,
    batchError,
    startBatch,
    stopBatch,
    internalGeneration: { progress, result, generating, generate, reset, abort, fixing, fixIssues },
  };
}
