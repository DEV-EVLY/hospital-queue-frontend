import React from 'react';
import {
  Activity, AlertCircle, AlertTriangle, Baby, FlaskConical, Heart, SmilePlus, Stethoscope,
} from 'lucide-react';

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  'alert-circle':   <AlertCircle   className="w-10 h-10 text-rose-500" />,
  'alert-triangle': <AlertTriangle className="w-10 h-10 text-rose-500" />,
  'activity':       <Activity      className="w-10 h-10 text-rose-500" />,
  'stethoscope':    <Stethoscope   className="w-10 h-10 text-primary-600" />,
  'baby':           <Baby          className="w-10 h-10 text-emerald-500" />,
  'heart':          <Heart         className="w-10 h-10 text-pink-500" />,
  'flask-conical':  <FlaskConical  className="w-10 h-10 text-amber-500" />,
  'flask':          <FlaskConical  className="w-10 h-10 text-amber-500" />,
  'smile':          <SmilePlus     className="w-10 h-10 text-violet-500" />,
};

/** Icono del servicio según el nombre guardado en el catálogo (uno neutro si no se reconoce). */
export const getServiceIcon = (iconName: string | null): React.ReactNode =>
  (iconName ? SERVICE_ICONS[iconName] : undefined) ?? <Activity className="w-10 h-10 text-surface-400" />;
