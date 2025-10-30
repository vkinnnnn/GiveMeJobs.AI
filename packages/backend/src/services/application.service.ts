import { Pool } from 'pg';
import { pgPool } from '../config/database';
import { Application, ApplicationStatus, ApplicationNote, ApplicationEvent } from '@givemejobs/shared-types';

/**
 * Application Service
 * Handles job application tracking and management
 */
export class ApplicationService {
  private db: Pool;

  constructor() {
    this.db = pgPool;
  }

  /**
   * Create a new job application
   */
  async createApplication(data: {
    userId: string;
    jobId: string;
    status?: ApplicationStatus;
    resumeId?: string;
    coverLetterId?: string;
    applicationMethod?: string;
    notes?: string;
  }): Promise<Application> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Create application
      const applicationQuery = `
        INSERT INTO applications (
          user_id, job_id, status, resume_id, cover_letter_id, application_method
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING 
          id, user_id, job_id, status, applied_date, last_updated,
          resume_id, cover_letter_id, application_method, follow_up_date,
          interview_date, offer_details, created_at
      `;

      const applicationResult = await client.query(applicationQuery, [
        data.userId,
        data.jobId,
        data.status || ApplicationStatus.SAVED,
        data.resumeId || null,
        data.coverLetterId || null,
        data.applicationMethod || null,
      ]);

      const application = applicationResult.rows[0];

      // Create initial timeline event
      await this.addTimelineEvent(
        client,
        application.id,
        'application_created',
        `Application created with status: ${application.status}`
      );

      // Add initial note if provided
      if (data.notes) {
        await this.addNote(client, application.id, data.notes, 'general');
      }

      await client.query('COMMIT');

      // Fetch complete application with notes and timeline
      return await this.getApplicationById(application.id, data.userId);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating application:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get application by ID
   */
  async getApplicationById(applicationId: string, userId: string): Promise<Application> {
    const query = `
      SELECT 
        a.id, a.user_id, a.job_id, a.status, a.applied_date, a.last_updated,
        a.resume_id, a.cover_letter_id, a.application_method, a.follow_up_date,
        a.interview_date, a.offer_details, a.created_at
      FROM applications a
      WHERE a.id = $1 AND a.user_id = $2
    `;

    const result = await this.db.query(query, [applicationId, userId]);

    if (result.rows.length === 0) {
      throw new Error('Application not found');
    }

    const application = this.mapRowToApplication(result.rows[0]);

    // Fetch notes
    application.notes = await this.getApplicationNotes(applicationId);

    // Fetch timeline
    application.timeline = await this.getApplicationTimeline(applicationId);

    return application;
  }

  /**
   * Get all applications for a user
   */
  async getUserApplications(
    userId: string,
    filters?: {
      status?: ApplicationStatus;
      jobId?: string;
      fromDate?: Date;
      toDate?: Date;
    }
  ): Promise<Application[]> {
    let query = `
      SELECT 
        a.id, a.user_id, a.job_id, a.status, a.applied_date, a.last_updated,
        a.resume_id, a.cover_letter_id, a.application_method, a.follow_up_date,
        a.interview_date, a.offer_details, a.created_at
      FROM applications a
      WHERE a.user_id = $1
    `;

    const params: any[] = [userId];
    let paramIndex = 2;

    if (filters?.status) {
      query += ` AND a.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.jobId) {
      query += ` AND a.job_id = $${paramIndex}`;
      params.push(filters.jobId);
      paramIndex++;
    }

    if (filters?.fromDate) {
      query += ` AND a.applied_date >= $${paramIndex}`;
      params.push(filters.fromDate);
      paramIndex++;
    }

    if (filters?.toDate) {
      query += ` AND a.applied_date <= $${paramIndex}`;
      params.push(filters.toDate);
      paramIndex++;
    }

    query += ' ORDER BY a.last_updated DESC';

    const result = await this.db.query(query, params);

    return result.rows.map((row) => this.mapRowToApplication(row));
  }

  /**
   * Update application details
   */
  async updateApplication(
    applicationId: string,
    userId: string,
    updates: {
      resumeId?: string;
      coverLetterId?: string;
      applicationMethod?: string;
      followUpDate?: Date;
      interviewDate?: Date;
      offerDetails?: any;
    }
  ): Promise<Application> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (updates.resumeId !== undefined) {
        updateFields.push(`resume_id = $${paramIndex}`);
        params.push(updates.resumeId);
        paramIndex++;
      }

      if (updates.coverLetterId !== undefined) {
        updateFields.push(`cover_letter_id = $${paramIndex}`);
        params.push(updates.coverLetterId);
        paramIndex++;
      }

      if (updates.applicationMethod !== undefined) {
        updateFields.push(`application_method = $${paramIndex}`);
        params.push(updates.applicationMethod);
        paramIndex++;
      }

      if (updates.followUpDate !== undefined) {
        updateFields.push(`follow_up_date = $${paramIndex}`);
        params.push(updates.followUpDate);
        paramIndex++;
      }

      if (updates.interviewDate !== undefined) {
        updateFields.push(`interview_date = $${paramIndex}`);
        params.push(updates.interviewDate);
        paramIndex++;
      }

      if (updates.offerDetails !== undefined) {
        updateFields.push(`offer_details = $${paramIndex}`);
        params.push(JSON.stringify(updates.offerDetails));
        paramIndex++;
      }

      if (updateFields.length === 0) {
        await client.query('ROLLBACK');
        return await this.getApplicationById(applicationId, userId);
      }

      updateFields.push(`last_updated = CURRENT_TIMESTAMP`);

      const query = `
        UPDATE applications
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING id
      `;

      params.push(applicationId, userId);

      const result = await client.query(query, params);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error('Application not found');
      }

      // Add timeline event
      await this.addTimelineEvent(
        client,
        applicationId,
        'application_updated',
        'Application details updated'
      );

      await client.query('COMMIT');

      return await this.getApplicationById(applicationId, userId);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating application:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete an application
   */
  async deleteApplication(applicationId: string, userId: string): Promise<boolean> {
    const query = `
      DELETE FROM applications
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;

    const result = await this.db.query(query, [applicationId, userId]);
    return result.rows.length > 0;
  }

  /**
   * Get application notes
   */
  private async getApplicationNotes(applicationId: string): Promise<ApplicationNote[]> {
    const query = `
      SELECT id, content, note_type as type, created_at
      FROM application_notes
      WHERE application_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query, [applicationId]);

    return result.rows.map((row) => ({
      id: row.id,
      content: row.content,
      type: row.type,
      createdAt: new Date(row.created_at),
    }));
  }

  /**
   * Get application timeline
   */
  private async getApplicationTimeline(applicationId: string): Promise<ApplicationEvent[]> {
    const query = `
      SELECT id, event_type, description, metadata, created_at as timestamp
      FROM application_timeline
      WHERE application_id = $1
      ORDER BY created_at ASC
    `;

    const result = await this.db.query(query, [applicationId]);

    return result.rows.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      description: row.description,
      timestamp: new Date(row.timestamp),
      metadata: row.metadata || {},
    }));
  }

  /**
   * Add a note to an application
   */
  private async addNote(
    client: any,
    applicationId: string,
    content: string,
    type: string = 'general'
  ): Promise<void> {
    const query = `
      INSERT INTO application_notes (application_id, content, note_type)
      VALUES ($1, $2, $3)
    `;

    await client.query(query, [applicationId, content, type]);
  }

  /**
   * Add a timeline event
   */
  private async addTimelineEvent(
    client: any,
    applicationId: string,
    eventType: string,
    description: string,
    metadata?: any
  ): Promise<void> {
    const query = `
      INSERT INTO application_timeline (application_id, event_type, description, metadata)
      VALUES ($1, $2, $3, $4)
    `;

    await client.query(query, [
      applicationId,
      eventType,
      description,
      metadata ? JSON.stringify(metadata) : '{}',
    ]);
  }

  /**
   * Update application status with validation and tracking
   */
  async updateApplicationStatus(
    applicationId: string,
    userId: string,
    newStatus: ApplicationStatus,
    notes?: string
  ): Promise<Application> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Get current application
      const currentQuery = `
        SELECT id, status
        FROM applications
        WHERE id = $1 AND user_id = $2
      `;

      const currentResult = await client.query(currentQuery, [applicationId, userId]);

      if (currentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error('Application not found');
      }

      const currentStatus = currentResult.rows[0].status as ApplicationStatus;

      // Validate status transition
      if (!this.isValidStatusTransition(currentStatus, newStatus)) {
        await client.query('ROLLBACK');
        throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
      }

      // Update status
      const updateQuery = `
        UPDATE applications
        SET status = $1, last_updated = CURRENT_TIMESTAMP
        WHERE id = $2 AND user_id = $3
        RETURNING id
      `;

      await client.query(updateQuery, [newStatus, applicationId, userId]);

      // Add timeline event for status change
      await this.addTimelineEvent(
        client,
        applicationId,
        'status_changed',
        `Status changed from ${currentStatus} to ${newStatus}`,
        {
          previousStatus: currentStatus,
          newStatus: newStatus,
        }
      );

      // Add note if provided
      if (notes) {
        await this.addNote(client, applicationId, notes, 'general');
      }

      // Trigger specific actions based on new status
      await this.handleStatusChange(client, applicationId, newStatus);

      await client.query('COMMIT');

      return await this.getApplicationById(applicationId, userId);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating application status:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Validate if status transition is allowed
   */
  private isValidStatusTransition(currentStatus: ApplicationStatus, newStatus: ApplicationStatus): boolean {
    // Define valid status transitions
    const validTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
      [ApplicationStatus.SAVED]: [
        ApplicationStatus.APPLIED,
        ApplicationStatus.WITHDRAWN,
      ],
      [ApplicationStatus.APPLIED]: [
        ApplicationStatus.SCREENING,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
      ],
      [ApplicationStatus.SCREENING]: [
        ApplicationStatus.INTERVIEW_SCHEDULED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
      ],
      [ApplicationStatus.INTERVIEW_SCHEDULED]: [
        ApplicationStatus.INTERVIEW_COMPLETED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
      ],
      [ApplicationStatus.INTERVIEW_COMPLETED]: [
        ApplicationStatus.OFFER_RECEIVED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
      ],
      [ApplicationStatus.OFFER_RECEIVED]: [
        ApplicationStatus.ACCEPTED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
      ],
      [ApplicationStatus.ACCEPTED]: [],
      [ApplicationStatus.REJECTED]: [],
      [ApplicationStatus.WITHDRAWN]: [],
    };

    // Allow staying in the same status (for updates without status change)
    if (currentStatus === newStatus) {
      return true;
    }

    const allowedTransitions = validTransitions[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Handle specific actions when status changes
   */
  private async handleStatusChange(
    client: any,
    applicationId: string,
    newStatus: ApplicationStatus
  ): Promise<void> {
    switch (newStatus) {
      case ApplicationStatus.APPLIED:
        // Set follow-up date to 14 days from now
        await client.query(
          `UPDATE applications SET follow_up_date = CURRENT_DATE + INTERVAL '14 days' WHERE id = $1`,
          [applicationId]
        );
        break;

      case ApplicationStatus.INTERVIEW_SCHEDULED:
        // This will trigger interview prep generation (handled in task 11)
        await this.addTimelineEvent(
          client,
          applicationId,
          'interview_prep_triggered',
          'Interview preparation materials can now be generated'
        );
        break;

      case ApplicationStatus.REJECTED:
        // Log rejection for analytics
        await this.addTimelineEvent(
          client,
          applicationId,
          'application_rejected',
          'Application was rejected'
        );
        break;

      case ApplicationStatus.OFFER_RECEIVED:
        // Celebrate!
        await this.addTimelineEvent(
          client,
          applicationId,
          'offer_received',
          'Congratulations! Offer received'
        );
        break;

      case ApplicationStatus.ACCEPTED:
        // Mark as successful completion
        await this.addTimelineEvent(
          client,
          applicationId,
          'offer_accepted',
          'Offer accepted - Application successful!'
        );
        break;

      default:
        // No specific action needed
        break;
    }
  }

  /**
   * Get status change history for an application
   */
  async getStatusHistory(applicationId: string, userId: string): Promise<ApplicationEvent[]> {
    // Verify ownership
    const ownershipQuery = `
      SELECT id FROM applications WHERE id = $1 AND user_id = $2
    `;
    const ownershipResult = await this.db.query(ownershipQuery, [applicationId, userId]);

    if (ownershipResult.rows.length === 0) {
      throw new Error('Application not found');
    }

    const query = `
      SELECT id, event_type, description, metadata, created_at as timestamp
      FROM application_timeline
      WHERE application_id = $1 AND event_type = 'status_changed'
      ORDER BY created_at ASC
    `;

    const result = await this.db.query(query, [applicationId]);

    return result.rows.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      description: row.description,
      timestamp: new Date(row.timestamp),
      metadata: row.metadata || {},
    }));
  }

  /**
   * Add a note to an application (public method)
   */
  async addApplicationNote(
    applicationId: string,
    userId: string,
    content: string,
    type: 'general' | 'interview' | 'feedback' | 'follow-up' = 'general'
  ): Promise<ApplicationNote> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Verify ownership
      const ownershipQuery = `
        SELECT id FROM applications WHERE id = $1 AND user_id = $2
      `;
      const ownershipResult = await client.query(ownershipQuery, [applicationId, userId]);

      if (ownershipResult.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error('Application not found');
      }

      // Insert note
      const noteQuery = `
        INSERT INTO application_notes (application_id, content, note_type)
        VALUES ($1, $2, $3)
        RETURNING id, content, note_type as type, created_at
      `;

      const noteResult = await client.query(noteQuery, [applicationId, content, type]);

      // Add timeline event
      await this.addTimelineEvent(
        client,
        applicationId,
        'note_added',
        `Note added: ${type}`,
        { noteType: type }
      );

      // Update last_updated timestamp
      await client.query(
        `UPDATE applications SET last_updated = CURRENT_TIMESTAMP WHERE id = $1`,
        [applicationId]
      );

      await client.query('COMMIT');

      const note = noteResult.rows[0];
      return {
        id: note.id,
        content: note.content,
        type: note.type,
        createdAt: new Date(note.created_at),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error adding note:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all notes for an application (public method)
   */
  async getApplicationNotesPublic(applicationId: string, userId: string): Promise<ApplicationNote[]> {
    // Verify ownership
    const ownershipQuery = `
      SELECT id FROM applications WHERE id = $1 AND user_id = $2
    `;
    const ownershipResult = await this.db.query(ownershipQuery, [applicationId, userId]);

    if (ownershipResult.rows.length === 0) {
      throw new Error('Application not found');
    }

    return await this.getApplicationNotes(applicationId);
  }

  /**
   * Update a note
   */
  async updateApplicationNote(
    noteId: string,
    applicationId: string,
    userId: string,
    content: string
  ): Promise<ApplicationNote> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Verify ownership through application
      const ownershipQuery = `
        SELECT an.id 
        FROM application_notes an
        JOIN applications a ON an.application_id = a.id
        WHERE an.id = $1 AND an.application_id = $2 AND a.user_id = $3
      `;
      const ownershipResult = await client.query(ownershipQuery, [noteId, applicationId, userId]);

      if (ownershipResult.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error('Note not found');
      }

      // Update note
      const updateQuery = `
        UPDATE application_notes
        SET content = $1
        WHERE id = $2
        RETURNING id, content, note_type as type, created_at
      `;

      const result = await client.query(updateQuery, [content, noteId]);

      // Add timeline event
      await this.addTimelineEvent(
        client,
        applicationId,
        'note_updated',
        'Note updated'
      );

      await client.query('COMMIT');

      const note = result.rows[0];
      return {
        id: note.id,
        content: note.content,
        type: note.type,
        createdAt: new Date(note.created_at),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating note:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a note
   */
  async deleteApplicationNote(
    noteId: string,
    applicationId: string,
    userId: string
  ): Promise<boolean> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Verify ownership through application
      const ownershipQuery = `
        SELECT an.id 
        FROM application_notes an
        JOIN applications a ON an.application_id = a.id
        WHERE an.id = $1 AND an.application_id = $2 AND a.user_id = $3
      `;
      const ownershipResult = await client.query(ownershipQuery, [noteId, applicationId, userId]);

      if (ownershipResult.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error('Note not found');
      }

      // Delete note
      const deleteQuery = `
        DELETE FROM application_notes
        WHERE id = $1
        RETURNING id
      `;

      const result = await client.query(deleteQuery, [noteId]);

      // Add timeline event
      await this.addTimelineEvent(
        client,
        applicationId,
        'note_deleted',
        'Note deleted'
      );

      await client.query('COMMIT');

      return result.rows.length > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting note:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get complete timeline for an application (public method)
   */
  async getApplicationTimelinePublic(applicationId: string, userId: string): Promise<ApplicationEvent[]> {
    // Verify ownership
    const ownershipQuery = `
      SELECT id FROM applications WHERE id = $1 AND user_id = $2
    `;
    const ownershipResult = await this.db.query(ownershipQuery, [applicationId, userId]);

    if (ownershipResult.rows.length === 0) {
      throw new Error('Application not found');
    }

    return await this.getApplicationTimeline(applicationId);
  }

  /**
   * Get application progress visualization data (health bar)
   */
  async getApplicationProgress(applicationId: string, userId: string): Promise<{
    currentStage: string;
    progress: number;
    stages: Array<{
      name: string;
      status: 'completed' | 'current' | 'pending';
      completedAt?: Date;
    }>;
  }> {
    // Get application
    const application = await this.getApplicationById(applicationId, userId);

    // Define application stages in order
    const stageOrder = [
      { key: ApplicationStatus.SAVED, name: 'Saved', weight: 10 },
      { key: ApplicationStatus.APPLIED, name: 'Applied', weight: 25 },
      { key: ApplicationStatus.SCREENING, name: 'Screening', weight: 40 },
      { key: ApplicationStatus.INTERVIEW_SCHEDULED, name: 'Interview Scheduled', weight: 55 },
      { key: ApplicationStatus.INTERVIEW_COMPLETED, name: 'Interview Completed', weight: 70 },
      { key: ApplicationStatus.OFFER_RECEIVED, name: 'Offer Received', weight: 90 },
      { key: ApplicationStatus.ACCEPTED, name: 'Accepted', weight: 100 },
    ];

    // Terminal states (not part of normal flow)
    const terminalStates = [ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN];

    // Get status history to determine completed stages
    const statusHistory = await this.getStatusHistory(applicationId, userId);

    // Build stages array with completion status
    const stages = stageOrder.map((stage) => {
      const statusEvent = statusHistory.find(
        (event) => event.metadata?.newStatus === stage.key
      );

      let status: 'completed' | 'current' | 'pending';
      if (application.status === stage.key) {
        status = 'current';
      } else if (statusEvent || this.isStageCompleted(stage.key, application.status, stageOrder)) {
        status = 'completed';
      } else {
        status = 'pending';
      }

      return {
        name: stage.name,
        status,
        completedAt: statusEvent ? statusEvent.timestamp : undefined,
      };
    });

    // Calculate progress percentage
    let progress: number;
    if (terminalStates.includes(application.status)) {
      // For terminal states, show progress based on how far they got
      const lastCompletedStage = stageOrder.findIndex((s) => s.key === application.status);
      if (lastCompletedStage >= 0) {
        progress = stageOrder[lastCompletedStage].weight;
      } else {
        // For rejected/withdrawn, find the last valid stage they were in
        const lastValidStatus = statusHistory
          .reverse()
          .find((event) => !terminalStates.includes(event.metadata?.newStatus as ApplicationStatus));
        
        if (lastValidStatus) {
          const stageIndex = stageOrder.findIndex((s) => s.key === lastValidStatus.metadata?.newStatus);
          progress = stageIndex >= 0 ? stageOrder[stageIndex].weight : 0;
        } else {
          progress = 0;
        }
      }
    } else {
      // Normal flow - use stage weight
      const currentStageIndex = stageOrder.findIndex((s) => s.key === application.status);
      progress = currentStageIndex >= 0 ? stageOrder[currentStageIndex].weight : 0;
    }

    // Determine current stage name
    let currentStage: string;
    if (application.status === ApplicationStatus.REJECTED) {
      currentStage = 'Rejected';
    } else if (application.status === ApplicationStatus.WITHDRAWN) {
      currentStage = 'Withdrawn';
    } else {
      const stage = stageOrder.find((s) => s.key === application.status);
      currentStage = stage ? stage.name : 'Unknown';
    }

    return {
      currentStage,
      progress,
      stages,
    };
  }

  /**
   * Check if a stage is completed based on current status
   */
  private isStageCompleted(
    stageKey: ApplicationStatus,
    currentStatus: ApplicationStatus,
    stageOrder: Array<{ key: ApplicationStatus; name: string; weight: number }>
  ): boolean {
    const stageIndex = stageOrder.findIndex((s) => s.key === stageKey);
    const currentIndex = stageOrder.findIndex((s) => s.key === currentStatus);

    // If current status is further along, this stage is completed
    return currentIndex > stageIndex;
  }

  /**
   * Get application statistics for a user
   */
  async getUserStatistics(userId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    responseRate: number;
    averageResponseTime: number;
    interviewConversionRate: number;
    offerRate: number;
    recentActivity: Array<{
      date: string;
      count: number;
    }>;
  }> {
    // Get total count and count by status
    const statusQuery = `
      SELECT 
        COUNT(*) as total,
        status,
        COUNT(*) FILTER (WHERE status = $2) as applied_count,
        COUNT(*) FILTER (WHERE status IN ($3, $4, $5, $6)) as responded_count,
        COUNT(*) FILTER (WHERE status IN ($4, $5, $6)) as interview_count,
        COUNT(*) FILTER (WHERE status IN ($6, $7)) as offer_count
      FROM applications
      WHERE user_id = $1
      GROUP BY status
    `;

    const statusResult = await this.db.query(statusQuery, [
      userId,
      ApplicationStatus.APPLIED,
      ApplicationStatus.SCREENING,
      ApplicationStatus.INTERVIEW_SCHEDULED,
      ApplicationStatus.INTERVIEW_COMPLETED,
      ApplicationStatus.OFFER_RECEIVED,
      ApplicationStatus.ACCEPTED,
    ]);

    // Calculate totals
    let total = 0;
    let appliedCount = 0;
    let respondedCount = 0;
    let interviewCount = 0;
    let offerCount = 0;
    const byStatus: Record<string, number> = {};

    statusResult.rows.forEach((row) => {
      const count = parseInt(row.total);
      total += count;
      byStatus[row.status] = count;

      if (row.status === ApplicationStatus.APPLIED) {
        appliedCount += count;
      }
      if ([ApplicationStatus.SCREENING, ApplicationStatus.INTERVIEW_SCHEDULED, 
           ApplicationStatus.INTERVIEW_COMPLETED, ApplicationStatus.OFFER_RECEIVED].includes(row.status)) {
        respondedCount += count;
      }
      if ([ApplicationStatus.INTERVIEW_SCHEDULED, ApplicationStatus.INTERVIEW_COMPLETED, 
           ApplicationStatus.OFFER_RECEIVED].includes(row.status)) {
        interviewCount += count;
      }
      if ([ApplicationStatus.OFFER_RECEIVED, ApplicationStatus.ACCEPTED].includes(row.status)) {
        offerCount += count;
      }
    });

    // Calculate response rate (applications that got a response / total applied)
    const responseRate = appliedCount > 0 ? (respondedCount / appliedCount) * 100 : 0;

    // Calculate interview conversion rate (got interview / got response)
    const interviewConversionRate = respondedCount > 0 ? (interviewCount / respondedCount) * 100 : 0;

    // Calculate offer rate (got offer / total applied)
    const offerRate = appliedCount > 0 ? (offerCount / appliedCount) * 100 : 0;

    // Calculate average response time
    const responseTimeQuery = `
      SELECT AVG(
        EXTRACT(EPOCH FROM (
          (SELECT MIN(created_at) 
           FROM application_timeline 
           WHERE application_id = a.id 
           AND event_type = 'status_changed'
           AND metadata->>'newStatus' IN ('screening', 'interview_scheduled')
          ) - a.applied_date
        )) / 86400
      ) as avg_days
      FROM applications a
      WHERE user_id = $1 
      AND status IN ($2, $3, $4, $5, $6)
    `;

    const responseTimeResult = await this.db.query(responseTimeQuery, [
      userId,
      ApplicationStatus.SCREENING,
      ApplicationStatus.INTERVIEW_SCHEDULED,
      ApplicationStatus.INTERVIEW_COMPLETED,
      ApplicationStatus.OFFER_RECEIVED,
      ApplicationStatus.ACCEPTED,
    ]);

    const averageResponseTime = responseTimeResult.rows[0]?.avg_days 
      ? Math.round(parseFloat(responseTimeResult.rows[0].avg_days))
      : 0;

    // Get recent activity (last 30 days)
    const activityQuery = `
      SELECT 
        DATE(applied_date) as date,
        COUNT(*) as count
      FROM applications
      WHERE user_id = $1
      AND applied_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(applied_date)
      ORDER BY date DESC
    `;

    const activityResult = await this.db.query(activityQuery, [userId]);

    const recentActivity = activityResult.rows.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      count: parseInt(row.count),
    }));

    return {
      total,
      byStatus,
      responseRate: Math.round(responseRate * 10) / 10, // Round to 1 decimal
      averageResponseTime,
      interviewConversionRate: Math.round(interviewConversionRate * 10) / 10,
      offerRate: Math.round(offerRate * 10) / 10,
      recentActivity,
    };
  }

  /**
   * Map database row to Application object
   */
  private mapRowToApplication(row: any): Application {
    return {
      id: row.id,
      userId: row.user_id,
      jobId: row.job_id,
      status: row.status as ApplicationStatus,
      appliedDate: new Date(row.applied_date),
      lastUpdated: new Date(row.last_updated),
      resumeId: row.resume_id,
      coverLetterId: row.cover_letter_id,
      applicationMethod: row.application_method,
      notes: [], // Will be populated separately
      timeline: [], // Will be populated separately
      followUpDate: row.follow_up_date ? new Date(row.follow_up_date) : undefined,
      interviewDate: row.interview_date ? new Date(row.interview_date) : undefined,
      offerDetails: row.offer_details || undefined,
    };
  }
}

export const applicationService = new ApplicationService();
