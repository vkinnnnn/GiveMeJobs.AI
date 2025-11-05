{{/*
Expand the name of the chart.
*/}}
{{- define "givemejobs.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "givemejobs.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "givemejobs.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "givemejobs.labels" -}}
helm.sh/chart: {{ include "givemejobs.chart" . }}
{{ include "givemejobs.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: givemejobs
{{- end }}

{{/*
Selector labels
*/}}
{{- define "givemejobs.selectorLabels" -}}
app.kubernetes.io/name: {{ include "givemejobs.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "givemejobs.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "givemejobs.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Database connection string for PostgreSQL
*/}}
{{- define "givemejobs.postgresql.connectionString" -}}
{{- if .Values.postgresql.enabled }}
postgresql://{{ .Values.postgresql.auth.username }}:{{ .Values.postgresql.auth.password }}@{{ include "givemejobs.fullname" . }}-postgresql:5432/{{ .Values.postgresql.auth.database }}
{{- else }}
postgresql://{{ .Values.externalDatabase.username }}:{{ .Values.externalDatabase.password }}@{{ .Values.externalDatabase.host }}:{{ .Values.externalDatabase.port }}/{{ .Values.externalDatabase.database }}
{{- end }}
{{- end }}

{{/*
MongoDB connection string
*/}}
{{- define "givemejobs.mongodb.connectionString" -}}
{{- if .Values.mongodb.enabled }}
mongodb://{{ .Values.mongodb.auth.rootUser }}:{{ .Values.mongodb.auth.rootPassword }}@{{ include "givemejobs.fullname" . }}-mongodb:27017/{{ index .Values.mongodb.auth.databases 0 }}
{{- else }}
mongodb://{{ .Values.externalMongodb.username }}:{{ .Values.externalMongodb.password }}@{{ .Values.externalMongodb.host }}:{{ .Values.externalMongodb.port }}/{{ .Values.externalMongodb.database }}
{{- end }}
{{- end }}

{{/*
Redis connection string
*/}}
{{- define "givemejobs.redis.connectionString" -}}
{{- if .Values.redis.enabled }}
redis://:{{ .Values.redis.auth.password }}@{{ include "givemejobs.fullname" . }}-redis-master:6379/0
{{- else }}
redis://:{{ .Values.externalRedis.password }}@{{ .Values.externalRedis.host }}:{{ .Values.externalRedis.port }}/0
{{- end }}
{{- end }}