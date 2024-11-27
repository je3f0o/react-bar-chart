/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
 * File Name   : index.tsx
 * Created at  : 2024-11-26
 * Updated at  : 2024-11-28
 * Author      : jeefo
 * Purpose     :
 * Description :
.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.*/
import {
  useRef,
  useState,
  useEffect,
} from "react";
import "./style.sass";

type BarChartDragStateType = {
  mouseX         : number;
  selectionEnd   : number;
  selectionStart : number;
  selectionWidth : number;
};

type BarChartStateType = {
  drag              : BarChartDragStateType;
  selectedData      : Record<string, any>[] | null;
  labelWidth        : number;
  labelHeight       : number;
  endIndex          : number | null;
  startIndex        : number | null;
  selectionEnd      : number | null;
  selectionStart    : number | null;
  mainCtx?          : CanvasRenderingContext2D;
  mainCanvas?       : HTMLCanvasElement;
  overviewCtx?      : CanvasRenderingContext2D;
  overviewCanvas?   : HTMLCanvasElement;
  isMouseDown?      : boolean;
  mouseDownX?       : number;
  mouseY?           : number;
  hoveringBarIndex? : number;
  selectedBarIndex? : number;
};

const defaultState: BarChartStateType = {
  drag             : null,
  labelWidth       : 0,
  labelHeight      : 0,
  endIndex         : null,
  selectedData     : null,
  startIndex       : null,
  selectionEnd     : null,
  selectionStart   : null,
};

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  if (typeof radius === "number") {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    radius = {
      tl: radius.tl || 0,
      tr: radius.tr || 0,
      br: radius.br || 0,
      bl: radius.bl || 0,
    };
  }

  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y); // Move to top-left corner

  ctx.lineTo(x + width - radius.tr, y); // Top edge
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr); // Top-right corner

  ctx.lineTo(x + width, y + height - radius.br); // Right edge
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height); // Bottom-right corner

  ctx.lineTo(x + radius.bl, y + height); // Bottom edge
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl); // Bottom-left corner

  ctx.lineTo(x, y + radius.tl); // Left edge
  ctx.quadraticCurveTo(x, y, x + radius.tl, y); // Top-left corner

  ctx.closePath();

  ctx.fill();
};

const pad = (value: number) => value.toString().padStart(2, '0');
const getMonth = (d: Date) => pad(d.getMonth() + 1);

const reTransform = (ctx: CanvasRenderingContext2D) => {
  const {canvas} = ctx;
  const rect = canvas.getBoundingClientRect();

  canvas.width  = rect.width;
  canvas.height = rect.height;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.translate(0, canvas.height);
  ctx.scale(1, -1);
};

const getMousePosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
  const rect = e.currentTarget.getBoundingClientRect();
  return e.clientX - rect.left;
};

const clamp = (value: number, min: number, max: number) => (
  Math.max(Math.min(value, max), min)
);

interface Props {
  data                          : Record<string, any>[];
  onSelect?                     : (record: Record<string, any>) => void;
  mainBarColor?                 : string;
  mainBarHoverColor?            : string;
  mainSelectedBarColor?         : string;
  mainSelectedBarBorderColor?   : string;
  barWidthRatio?                : number;
  labelFontSize?                : number;
  labelFontWeight?              : number;
  labelFontFamily?              : string;
  popupBackgroundColor?         : string;
  overviewBarColor?             : string;
  overviewBorderColor?          : string;
  overviewSelectionColor?       : string;
  overviewSelectedBarColor?     : string;
  overviewSelectionBorderColor? : string;
};

export default ({
  data,
  onSelect,
  mainBarColor                 = "#A4CDFE",
  mainBarHoverColor            = "#7DABF8",
  mainSelectedBarColor         = "#F8B886",
  mainSelectedBarBorderColor   = "#C44C34",
  barWidthRatio                = 0.6,
  labelFontSize                = 12,
  labelFontWeight              = 500,
  labelFontFamily              = "Arial",
  overviewBarColor             = "#A3ACB9",
  popupBackgroundColor         = "#3F3F3F",
  overviewSelectionColor       = "#D6ECFF",
  overviewSelectedBarColor     = "#4F566B",
  overviewSelectionBorderColor = "#7DABF8",
  overviewBorderColor,
}: Props) => {
  const stateRef     = useRef<BarChartStateType>(defaultState);
  const containerRef = useRef<HTMLDivElement>();

  const labelFont         = `${labelFontWeight} ${labelFontSize}px ${labelFontFamily}`;
  const popupWidth        = 145;
  const popupHeight       = 25;
  const popupMargin       = 10;
  const rightMargin       = 10;
  const leftLabelWidth    = 70;
  const bottomLabelHeight = 30;

  const onMouseUp = (e: MouseEvent) => {
    const state = stateRef.current;

    const rect   = state.overviewCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    if (state.mouseDownX === mouseX) {
      state.endIndex       = null;
      state.startIndex     = null;
      state.selectedData   = null;
      state.selectionEnd   = null;
      state.selectionStart = null;
    }

    document.body.style.cursor = null;

    state.drag        = null;
    state.isMouseDown = false;
    drawChart();
    cleanup();
  };

  const onMouseMove = (e: MouseEvent) => {
    const state = stateRef.current;
    if (!state.isMouseDown) return;

    const rect         = state.overviewCanvas.getBoundingClientRect();
    const mouseX       = e.clientX - rect.left;
    const fullBarWidth = rect.width / data.length;
    const barWidth     = fullBarWidth * barWidthRatio;
    const gap          = fullBarWidth - barWidth;
    const margin       = gap * 0.5;

    if (state.drag) {
      const dx = mouseX - state.drag.mouseX;

      const x1 = state.drag.selectionStart + dx;
      const x2 = state.drag.selectionEnd   + dx;

      let startX = Math.min(x1, x2);
      let endX   = Math.max(x1, x2);

      endX   = clamp(endX, state.drag.selectionWidth, rect.width);
      startX = clamp(startX, 0, rect.width - state.drag.selectionWidth);

      state.selectionEnd   = endX;
      state.selectionStart = startX;
    } else {
      const {mouseDownX} = state;
      state.selectionEnd   = Math.max(mouseX, mouseDownX);
      state.selectionStart = Math.min(mouseX, mouseDownX);
    }

    let startIndex = Math.ceil(
      (state.selectionStart / rect.width) * data.length
    );
    if (state.selectionStart < startIndex * fullBarWidth - margin) {
      startIndex = Math.max(0, startIndex - 1);
    }

    let endIndex = Math.floor(
      (state.selectionEnd / rect.width) * data.length
    );
    if (state.selectionEnd < endIndex * fullBarWidth + margin) {
      endIndex -= 1;
    }

    if (startIndex > endIndex) {
      state.endIndex     = null;
      state.startIndex   = null;
      state.selectedData = null;
    } else {
      state.endIndex     = endIndex;
      state.startIndex   = startIndex;
      state.selectedData = data.slice(startIndex, endIndex + 1);
    }

    drawChart();
  };

  const cleanup = () => {
    document.removeEventListener("mouseup"   , onMouseUp);
    document.removeEventListener("mousemove" , onMouseMove);
  };

  useEffect(() => {
    const state       = stateRef.current;
    const containerEl = containerRef.current;

    const mainCanvas: any     = containerEl.querySelector(".bar-chart__main");
    const overviewCanvas: any = containerEl.querySelector(".bar-chart__overview");

    const mainCtx     = mainCanvas.getContext("2d");
    const overviewCtx = overviewCanvas.getContext("2d");

    state.mainCtx        = mainCtx;
    state.mainCanvas     = mainCanvas;
    state.overviewCtx    = overviewCtx;
    state.overviewCanvas = overviewCanvas;

    if (overviewBorderColor) {
      containerEl.style.setProperty("--border-color", overviewBorderColor);
    }

    const measureEl: any = containerEl.querySelector(".bar-chart__measurement");
    const rect = measureEl.getBoundingClientRect();
    state.labelWidth  = rect.width;
    state.labelHeight = rect.height;
    measureEl.style.display = "none";

    drawChart();

    return cleanup;
  }, []);

  const hasSelection = () => {
    const {selectionStart, selectionEnd} = stateRef.current;
    return selectionStart !== null && selectionEnd !== null;
  };

  const hasSelectedData = () => {
    const {startIndex, endIndex} = stateRef.current;
    return startIndex !== null && endIndex !== null;
  };

  const isInSelectionRange = (x: number) => {
    const {selectionStart, selectionEnd} = stateRef.current;
    return x >= selectionStart && x <= selectionEnd;
  };

  const isIndexInSelctedRange = (index: number) => {
    const {startIndex, endIndex} = stateRef.current;
    return index >= startIndex && index <= endIndex;
  };

  const calcChartSize = (canvas: HTMLCanvasElement) => ({
    chartWidth  : canvas.width  - leftLabelWidth - rightMargin,
    chartHeight : canvas.height - bottomLabelHeight - popupHeight - popupMargin,
  });

  const drawPopup = (ctx: CanvasRenderingContext2D, {
    barHeight,
    barMargin,
    fullBarWidth,
    chartWidth,
    chartHeight,
  }) => {
    const state        = stateRef.current;
    const selectedData = state.selectedData || data;
    const barData      = selectedData[state.hoveringBarIndex];
    const caretWidth   = 7;

    const d = barData.date as Date;
    const month = getMonth(d);
    const day   = pad(d.getDate());
    const dateText = `${d.getFullYear()}-${month}-${day}`;
    const text = `${dateText}    ${barData.time} минут`;

    const y       = barHeight + popupMargin;
    let barStartX = state.hoveringBarIndex * fullBarWidth;

    let popupX = barStartX + fullBarWidth * 0.5 - popupWidth * 0.5;

    if (popupX + popupWidth - 5 > chartWidth) {
      popupX = chartWidth - popupWidth + 5;
    }

    ctx.fillStyle = popupBackgroundColor;
    //ctx.fillRect(x, y, popupWidth, popupHeight);
    drawRoundedRect(ctx, popupX, y, popupWidth, popupHeight, 4);

    const caretX         = barStartX + fullBarWidth * 0.5;
    const caretHalfWidth = caretWidth * 0.5;

    ctx.save();
    ctx.translate(caretX, y + 5);
    ctx.rotate(Math.PI * -0.75);
    ctx.fillRect(0, 0, caretWidth, caretWidth);
    ctx.restore();

    const fontSize = 12;

    const textX = popupX + popupWidth * 0.5;
    const textY = y + (popupHeight - fontSize * 0.8) * 0.5;

    ctx.translate(textX, textY);
    ctx.scale(1, -1);

    ctx.font      = `${fontSize}px arial`;
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.fillText(text, 0, 0);
  };

  const drawMainChart = () => {
    const state                         = stateRef.current;
    const ctx: CanvasRenderingContext2D = state.mainCtx;

    const {canvas}        = ctx;
    const rect            = canvas.getBoundingClientRect();
    const {width, height} = rect;
    const selectedData    = state.selectedData || data;

    // Resetting transformation matrix
    canvas.width  = rect.width;
    canvas.height = rect.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const minutes   = selectedData.map(d => d.time);
    const maxMinute = Math.max(...minutes);

    const {chartWidth, chartHeight} = calcChartSize(canvas);
    const fontSize          = 16;
    const vFontAlignment    = fontSize * 0.27;

    // Draw left labels
    ctx.translate(leftLabelWidth, 0.5);
    ctx.font                  = labelFont;
    ctx.textAlign             = "right";
    ctx.imageSmoothingEnabled = false;
    ctx.beginPath();

    ctx.fillStyle = "rgba(0, 0, 0, 0.87)";
    const chartY = popupHeight + popupMargin;
    const numLabels        = maxMinute / 10;
    const desiredNumLabels = chartHeight / (state.labelHeight + 24);
    const minutesGap = Math.ceil(numLabels / desiredNumLabels) * 10;
    for (let i = 0; i < maxMinute; i += minutesGap) {
      const y = chartY + chartHeight - ((i / maxMinute) * chartHeight);
      ctx.fillText(`${i} мин`, -5, y + vFontAlignment);

      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
    }

    ctx.strokeStyle = "#C1C9D2";
    ctx.stroke();

    //ctx.fillRect(0, chartY, chartWidth, chartHeight);

    const fullBarWidth = chartWidth / selectedData.length;

    // Draw bottom labels
    const barCenterX = fullBarWidth * 0.5;
    const y = chartHeight + popupHeight + popupMargin + bottomLabelHeight - labelFontSize;
    ctx.font      = labelFont;
    ctx.textAlign = "center";

    const fullLabelWidth = state.labelWidth + 24;
    const numBars = Math.ceil(fullLabelWidth / fullBarWidth);
    for (let i = 0; i < selectedData.length; i += numBars) {
      const x = i * fullBarWidth + barCenterX;
      const d = selectedData[i].date as Date;
      ctx.fillText(`${getMonth(d)}/${pad(d.getDate())}`, x, y);
    }

    // Draw bars
    ctx.translate(0, chartHeight + popupHeight + popupMargin);
    ctx.scale(1, -1);

    const barWidth = fullBarWidth * barWidthRatio;
    const margin   = (fullBarWidth - barWidth) * 0.5;

    let hoverBarHeight;
    for (let i = 0; i < selectedData.length; ++i) {
      const x = i * fullBarWidth + margin;
      const h = (selectedData[i].time / maxMinute) * chartHeight;
      if (state.selectedBarIndex === i) {
        ctx.fillStyle   = mainSelectedBarColor;
        ctx.strokeStyle = mainSelectedBarBorderColor;
      } else if (state.hoveringBarIndex === i) {
        ctx.fillStyle = mainBarHoverColor;
      } else {
        ctx.fillStyle = mainBarColor;
      }

      if (state.hoveringBarIndex === i) {
        hoverBarHeight = h;
      }

      const radius = Math.max(4, Math.min(barWidth, h) * 0.2);

      //ctx.fillRect(x, 0, barWidth, h);
      drawRoundedRect(ctx, x, 0, barWidth, h, {
        bl: radius,
        br: radius,
      });
      if (state.selectedBarIndex === i) {
        ctx.stroke();
      }
    }

    if (hoverBarHeight) {
      drawPopup(ctx, {
        fullBarWidth,
        chartWidth,
        chartHeight,
        barHeight: hoverBarHeight,
        barMargin: margin,
      });
    }
  };

  const drawOverview = () => {
    const state = stateRef.current;
    const {overviewCtx: ctx} = state;

    reTransform(ctx);

    if (hasSelection()) {
      const {selectionStart, selectionEnd} = stateRef.current;
      const x        = Math.min(selectionStart, selectionEnd);
      const width    = Math.abs(selectionEnd - selectionStart);
      const {height} = ctx.canvas;

      // selection fill color
      ctx.fillStyle = overviewSelectionColor;
      ctx.fillRect(x, 0, width, height);

      // selection border lines
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);

      ctx.moveTo(x+width, 0);
      ctx.lineTo(x+width, height);

      ctx.lineWidth   = 2;
      ctx.strokeStyle = overviewSelectionBorderColor;
      ctx.stroke();
    }

    const rect = ctx.canvas.getBoundingClientRect();

    const minutes   = data.map(d => d.time);
    const maxMinute = Math.max(...minutes);

    const fullBarWidth = rect.width / data.length;
    const barWidth     = fullBarWidth * barWidthRatio;
    const margin       = (fullBarWidth - barWidth) * 0.5;

    for (let i = 0; i < data.length; ++i) {
      const x = i * fullBarWidth + margin;
      const h = data[i].time / maxMinute * rect.height;

      if (hasSelectedData() && isIndexInSelctedRange(i)) {
        ctx.fillStyle = overviewSelectedBarColor;
      } else {
        ctx.fillStyle = overviewBarColor;
      }

      //ctx.fillRect(x, 0, barWidth, h);
      drawRoundedRect(ctx, x, 0, barWidth, h, {
        bl: barWidth * 0.2,
        br: barWidth * 0.2,
      });
    }
  };

  const drawChart = () => {
    drawOverview();
    drawMainChart();
  };

  const onMouseDownOverview = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    const state  = stateRef.current;
    const mouseX = getMousePosition(e);

    if (hasSelection() && isInSelectionRange(mouseX)) {
      state.drag = {
        mouseX,
        selectionEnd   : state.selectionEnd,
        selectionStart : state.selectionStart,
        selectionWidth : Math.abs(state.selectionEnd - state.selectionStart),
      };
      e.currentTarget.style.cursor = null;
      document.body.style.cursor   = "grabbing";
    } else {
      state.drag           = null;
      state.selectionEnd   = null;
      state.selectionStart = mouseX;
    }

    state.mouseDownX       = mouseX;
    state.isMouseDown      = true;
    state.selectedBarIndex = -1;

    document.addEventListener("mouseup"   , onMouseUp);
    document.addEventListener("mousemove" , onMouseMove);
  };

  const isMouseInsideBar = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const state  = stateRef.current;
    const rect   = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - leftLabelWidth;

    const selectedData = state.selectedData || data;
    const {chartWidth, chartHeight} = calcChartSize(e.currentTarget);

    const minutes   = selectedData.map(d => d.time);
    const maxMinute = Math.max(...minutes);

    let selectedBarIndex = Math.floor(
      (mouseX / chartWidth) * selectedData.length
    );
    if (selectedBarIndex >= selectedData.length) {
      selectedBarIndex = selectedData.length - 1;
    }
    if (selectedBarIndex < 0) return -1;

    const fullBarWidth = chartWidth / selectedData.length;
    const barWidth     = fullBarWidth * 0.6;
    const margin       = (fullBarWidth - barWidth) * 0.5;

    if (mouseX < (selectedBarIndex * fullBarWidth) + margin)     return -1;
    if (mouseX > (selectedBarIndex + 1) * fullBarWidth - margin) return -1;

    const mouseY = e.clientY - rect.top;
    const ratio  = selectedData[selectedBarIndex].time / maxMinute;

    const barHeight = chartHeight * ratio;
    const y = chartHeight - mouseY + popupHeight + popupMargin;

    if (y < 0 || y > barHeight) return -1;

    state.mouseY = mouseY;

    return selectedBarIndex;
  };

  const onMouseMoveOverview = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const state                    = stateRef.current;
    const {overviewCanvas: canvas} = state;
    if (state.isMouseDown) return;

    const mouseX = getMousePosition(e);
    if (!state.drag && hasSelection() && isInSelectionRange(mouseX)) {
      canvas.style.cursor = "move";
    } else {
      canvas.style.cursor = null;
    }
  };

  const onMouseDownMainChart = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const state = stateRef.current;
    state.selectedBarIndex = isMouseInsideBar(e);
    if (state.selectedBarIndex) {
      const selectedData = state.selectedData || data;
      onSelect?.(selectedData[state.selectedBarIndex]);
    }
    drawMainChart();
  };

  const onMouseMoveMainChart = (e: React.MouseEvent<HTMLCanvasElement>) => {
    stateRef.current.hoveringBarIndex = isMouseInsideBar(e);
    drawMainChart();
  };

  const labelStyle = {
    fontSize   : labelFontSize,
    fontWeight : labelFontWeight,
    fontFamily : labelFontFamily,
  };

  return (
    <div
      ref       = {containerRef}
      className = "bar-chart"
    >
      <canvas
        className   = "bar-chart__main"
        onMouseDown = {onMouseDownMainChart}
        onMouseMove = {onMouseMoveMainChart}
      />
      <canvas
        style       = {{marginInline: `${leftLabelWidth}px ${rightMargin}px`}}
        className   = "bar-chart__overview"
        onMouseDown = {onMouseDownOverview}
        onMouseMove = {onMouseMoveOverview}
      />
      <span
        style     = {labelStyle}
        className = "bar-chart__measurement"
      >69/69</span>
    </div>
  );
};