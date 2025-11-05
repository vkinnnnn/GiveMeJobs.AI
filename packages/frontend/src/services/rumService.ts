/**
 * Real User Monitoring (RUM) Service
 * Tracks frontend performance metrics and user experience data
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  unit?: string;
}

interface UserSession {
  sessionId: string;
  userId?: string;
  startTime: number;
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
  connection?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
}

// interface PageLoadMetrics {
//   url: string;
//   loadTime: number;
//   domContentLoaded: number;
//   firstContentfulPaint: number;
//   largestContentfulPaint: number;
//   firstInputDelay: number;
//   cumulativeLayoutShift: number;
//   timeToInteractive: number;
//   resourceLoadTimes: Array<{
//     name: string;
//     duration: number;
//     size: number;
//     type: string;
//   }>;
// }

interface UserInteraction {
  type: 'click' | 'scroll' | 'input' | 'navigation';
  element?: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface ErrorEvent {
  message: string;
  filename: string;
  lineno: number;
  colno: number;
  error: string;
  stack?: string;
  timestamp: number;
  url: string;
  userAgent: string;
}

class RealUserMonitoringService {
  private session: UserSession;
  private metrics: PerformanceMetric[] = [];
  private interactions: UserInteraction[] = [];
  private errors: ErrorEvent[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private isInitialized = false;
  private batchSize = 50;
  private flushInterval = 30000; // 30 seconds
  private apiEndpoint = '/api/rum/metrics';
  
  constructor() {
    this.session = this.createSession();
    this.setupErrorHandling();
    this.setupPerformanceObservers();
    this.setupUserInteractionTracking();
    this.startBatchFlush();
  }

  private createSession(): UserSession {
    const sessionId = this.generateSessionId();
    
    return {
      sessionId,
      startTime: Date.now(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      connection: this.getConnectionInfo()
    };
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getConnectionInfo() {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      return {
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0
      };
    }
    
    return undefined;
  }

  private setupErrorHandling(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.recordError({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.toString() || 'Unknown error',
        stack: event.error?.stack,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError({
        message: 'Unhandled Promise Rejection',
        filename: window.location.href,
        lineno: 0,
        colno: 0,
        error: event.reason?.toString() || 'Unknown rejection',
        stack: event.reason?.stack,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    });
  }

  private setupPerformanceObservers(): void {
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    // Navigation timing
    this.observeNavigationTiming();
    
    // Paint timing
    this.observePaintTiming();
    
    // Largest Contentful Paint
    this.observeLargestContentfulPaint();
    
    // First Input Delay
    this.observeFirstInputDelay();
    
    // Cumulative Layout Shift
    this.observeCumulativeLayoutShift();
    
    // Resource timing
    this.observeResourceTiming();
  }

  private observeNavigationTiming(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            
            this.recordMetric({
              name: 'navigation.domContentLoaded',
              value: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              timestamp: Date.now(),
              tags: { url: window.location.pathname },
              unit: 'ms'
            });
            
            this.recordMetric({
              name: 'navigation.loadComplete',
              value: navEntry.loadEventEnd - navEntry.loadEventStart,
              timestamp: Date.now(),
              tags: { url: window.location.pathname },
              unit: 'ms'
            });
            
            this.recordMetric({
              name: 'navigation.dnsLookup',
              value: navEntry.domainLookupEnd - navEntry.domainLookupStart,
              timestamp: Date.now(),
              unit: 'ms'
            });
            
            this.recordMetric({
              name: 'navigation.tcpConnect',
              value: navEntry.connectEnd - navEntry.connectStart,
              timestamp: Date.now(),
              unit: 'ms'
            });
            
            this.recordMetric({
              name: 'navigation.serverResponse',
              value: navEntry.responseEnd - navEntry.responseStart,
              timestamp: Date.now(),
              unit: 'ms'
            });
          }
        });
      });
      
      observer.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', observer);
    } catch (error) {
      console.warn('Failed to observe navigation timing:', error);
    }
  }

  private observePaintTiming(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          this.recordMetric({
            name: `paint.${entry.name}`,
            value: entry.startTime,
            timestamp: Date.now(),
            tags: { url: window.location.pathname },
            unit: 'ms'
          });
        });
      });
      
      observer.observe({ entryTypes: ['paint'] });
      this.observers.set('paint', observer);
    } catch (error) {
      console.warn('Failed to observe paint timing:', error);
    }
  }

  private observeLargestContentfulPaint(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        if (lastEntry) {
          this.recordMetric({
            name: 'lcp',
            value: lastEntry.startTime,
            timestamp: Date.now(),
            tags: { 
              url: window.location.pathname,
              element: (lastEntry as any).element?.tagName || 'unknown'
            },
            unit: 'ms'
          });
        }
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', observer);
    } catch (error) {
      console.warn('Failed to observe LCP:', error);
    }
  }

  private observeFirstInputDelay(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          this.recordMetric({
            name: 'fid',
            value: (entry as any).processingStart - entry.startTime,
            timestamp: Date.now(),
            tags: { url: window.location.pathname },
            unit: 'ms'
          });
        });
      });
      
      observer.observe({ entryTypes: ['first-input'] });
      this.observers.set('fid', observer);
    } catch (error) {
      console.warn('Failed to observe FID:', error);
    }
  }

  private observeCumulativeLayoutShift(): void {
    try {
      let clsValue = 0;
      
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        });
        
        this.recordMetric({
          name: 'cls',
          value: clsValue,
          timestamp: Date.now(),
          tags: { url: window.location.pathname },
          unit: 'score'
        });
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('cls', observer);
    } catch (error) {
      console.warn('Failed to observe CLS:', error);
    }
  }

  private observeResourceTiming(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          // Skip data URLs and same-origin requests to avoid noise
          if (resourceEntry.name.startsWith('data:') || 
              resourceEntry.name.includes(window.location.origin)) {
            return;
          }
          
          this.recordMetric({
            name: 'resource.loadTime',
            value: resourceEntry.responseEnd - resourceEntry.startTime,
            timestamp: Date.now(),
            tags: {
              resource: this.getResourceName(resourceEntry.name),
              type: this.getResourceType(resourceEntry.name),
              cached: resourceEntry.transferSize === 0 ? 'true' : 'false'
            },
            unit: 'ms'
          });
          
          // Track resource size
          if (resourceEntry.transferSize > 0) {
            this.recordMetric({
              name: 'resource.size',
              value: resourceEntry.transferSize,
              timestamp: Date.now(),
              tags: {
                resource: this.getResourceName(resourceEntry.name),
                type: this.getResourceType(resourceEntry.name)
              },
              unit: 'bytes'
            });
          }
        });
      });
      
      observer.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', observer);
    } catch (error) {
      console.warn('Failed to observe resource timing:', error);
    }
  }

  private getResourceName(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.split('/').pop() || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    
    if (['js', 'mjs'].includes(extension || '')) return 'script';
    if (['css'].includes(extension || '')) return 'stylesheet';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) return 'image';
    if (['woff', 'woff2', 'ttf', 'otf'].includes(extension || '')) return 'font';
    if (['json', 'xml'].includes(extension || '')) return 'xhr';
    
    return 'other';
  }

  private setupUserInteractionTracking(): void {
    // Track clicks
    document.addEventListener('click', (event) => {
      this.recordInteraction({
        type: 'click',
        element: this.getElementSelector(event.target as Element),
        timestamp: Date.now(),
        metadata: {
          x: event.clientX,
          y: event.clientY,
          button: event.button
        }
      });
    });

    // Track scroll performance
    let scrollTimeout: number;
    let scrollStart: number;
    
    document.addEventListener('scroll', () => {
      if (!scrollStart) {
        scrollStart = performance.now();
      }
      
      clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(() => {
        const scrollDuration = performance.now() - scrollStart;
        
        this.recordInteraction({
          type: 'scroll',
          timestamp: Date.now(),
          duration: scrollDuration,
          metadata: {
            scrollY: window.scrollY,
            scrollX: window.scrollX
          }
        });
        
        scrollStart = 0;
      }, 150);
    });

    // Track input performance
    document.addEventListener('input', (event) => {
      const inputStart = performance.now();
      
      // Measure input delay
      requestAnimationFrame(() => {
        const inputDelay = performance.now() - inputStart;
        
        this.recordInteraction({
          type: 'input',
          element: this.getElementSelector(event.target as Element),
          timestamp: Date.now(),
          duration: inputDelay,
          metadata: {
            inputType: (event.target as HTMLInputElement).type || 'unknown'
          }
        });
      });
    });

    // Track navigation
    window.addEventListener('beforeunload', () => {
      this.recordInteraction({
        type: 'navigation',
        timestamp: Date.now(),
        metadata: {
          timeOnPage: Date.now() - this.session.startTime,
          url: window.location.href
        }
      });
      
      // Flush remaining data
      this.flushMetrics(true);
    });
  }

  private getElementSelector(element: Element): string {
    if (!element) return 'unknown';
    
    // Try to get a meaningful selector
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.length > 0);
      if (classes.length > 0) {
        return `.${classes[0]}`;
      }
    }
    
    return element.tagName.toLowerCase();
  }

  private recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    if (this.metrics.length >= this.batchSize) {
      this.flushMetrics();
    }
  }

  private recordInteraction(interaction: UserInteraction): void {
    this.interactions.push(interaction);
    
    if (this.interactions.length >= this.batchSize) {
      this.flushInteractions();
    }
  }

  private recordError(error: ErrorEvent): void {
    this.errors.push(error);
    
    // Flush errors immediately for critical issues
    this.flushErrors();
  }

  private startBatchFlush(): void {
    setInterval(() => {
      this.flushMetrics();
      this.flushInteractions();
      this.flushErrors();
    }, this.flushInterval);
  }

  private async flushMetrics(force = false): Promise<void> {
    if (this.metrics.length === 0 || (!force && this.metrics.length < this.batchSize)) {
      return;
    }

    const metricsToSend = [...this.metrics];
    this.metrics = [];

    try {
      await this.sendData('metrics', {
        session: this.session,
        metrics: metricsToSend,
        timestamp: Date.now()
      });
    } catch (error) {
      console.warn('Failed to send metrics:', error);
      // Re-add metrics to queue for retry
      this.metrics.unshift(...metricsToSend);
    }
  }

  private async flushInteractions(force = false): Promise<void> {
    if (this.interactions.length === 0 || (!force && this.interactions.length < this.batchSize)) {
      return;
    }

    const interactionsToSend = [...this.interactions];
    this.interactions = [];

    try {
      await this.sendData('interactions', {
        session: this.session,
        interactions: interactionsToSend,
        timestamp: Date.now()
      });
    } catch (error) {
      console.warn('Failed to send interactions:', error);
      // Re-add interactions to queue for retry
      this.interactions.unshift(...interactionsToSend);
    }
  }

  private async flushErrors(): Promise<void> {
    if (this.errors.length === 0) {
      return;
    }

    const errorsToSend = [...this.errors];
    this.errors = [];

    try {
      await this.sendData('errors', {
        session: this.session,
        errors: errorsToSend,
        timestamp: Date.now()
      });
    } catch (error) {
      console.warn('Failed to send errors:', error);
      // Don't re-add errors to avoid infinite loops
    }
  }

  private async sendData(type: string, data: any): Promise<void> {
    const url = `${this.apiEndpoint}/${type}`;
    
    // Use sendBeacon if available for better reliability
    if (navigator.sendBeacon && type === 'errors') {
      const success = navigator.sendBeacon(url, JSON.stringify(data));
      if (!success) {
        throw new Error('sendBeacon failed');
      }
      return;
    }

    // Fallback to fetch
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      keepalive: true
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  // Public API methods
  public setUserId(userId: string): void {
    this.session.userId = userId;
  }

  public trackCustomMetric(name: string, value: number, tags?: Record<string, string>): void {
    this.recordMetric({
      name: `custom.${name}`,
      value,
      timestamp: Date.now(),
      tags,
      unit: 'custom'
    });
  }

  public trackPageView(url?: string): void {
    this.recordMetric({
      name: 'pageview',
      value: 1,
      timestamp: Date.now(),
      tags: {
        url: url || window.location.pathname,
        referrer: document.referrer || 'direct'
      },
      unit: 'count'
    });
  }

  public trackUserTiming(name: string, startTime: number, endTime?: number): void {
    const duration = (endTime || performance.now()) - startTime;
    
    this.recordMetric({
      name: `timing.${name}`,
      value: duration,
      timestamp: Date.now(),
      unit: 'ms'
    });
  }

  public getSessionId(): string {
    return this.session.sessionId;
  }

  public destroy(): void {
    // Clean up observers
    this.observers.forEach((observer) => {
      observer.disconnect();
    });
    this.observers.clear();

    // Flush remaining data
    this.flushMetrics(true);
    this.flushInteractions(true);
    this.flushErrors();
  }
}

// Create global instance
const rumService = new RealUserMonitoringService();

// Auto-track page view on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    rumService.trackPageView();
  });
} else {
  rumService.trackPageView();
}

export default rumService;