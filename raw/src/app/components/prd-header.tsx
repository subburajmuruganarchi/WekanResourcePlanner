import { Calendar, Users, Tag } from "lucide-react";
import { Badge } from "./ui/badge";

export function PRDHeader() {
  return (
    <div className="border-b border-gray-200 pb-8 mb-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <span>Product</span>
        <span>/</span>
        <span>PRDs</span>
        <span>/</span>
        <span className="text-gray-900">R360</span>
      </div>

      {/* Title with icon */}
      <div className="flex items-start gap-3 mb-6">
        <div className="text-4xl">📋</div>
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            R360 Product Requirements Document
          </h1>
          <p className="text-lg text-gray-600">
            Comprehensive 360-degree view platform for customer insights and analytics
          </p>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-6 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Users className="w-4 h-4" />
          <span>Owner: Sarah Chen</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>Last updated: Feb 6, 2026</span>
        </div>
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-gray-600" />
          <div className="flex gap-2">
            <Badge variant="secondary">Q1 2026</Badge>
            <Badge variant="secondary">High Priority</Badge>
            <Badge variant="secondary">Analytics</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
