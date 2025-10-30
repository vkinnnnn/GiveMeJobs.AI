import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { GeneratedDocument, DocumentSection } from '../config/mongodb-schemas';
import { Readable } from 'stream';

/**
 * Document Export Service
 * Handles exporting documents to PDF, DOCX, and plain text formats
 */
export class DocumentExportService {
  /**
   * Export document to PDF format
   */
  async exportToPDF(document: GeneratedDocument): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          margins: {
            top: document.content.formatting.margins.top,
            bottom: document.content.formatting.margins.bottom,
            left: document.content.formatting.margins.left,
            right: document.content.formatting.margins.right,
          },
        });

        const buffers: Buffer[] = [];
        
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Set default font
        doc.font('Helvetica');
        doc.fontSize(document.content.formatting.fontSize);

        // Render each section
        document.content.sections.forEach((section, index) => {
          if (index > 0) {
            doc.moveDown(0.5);
          }

          this.renderPDFSection(doc, section, document.content.formatting);
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Export document to DOCX format
   */
  async exportToDOCX(document: GeneratedDocument): Promise<Buffer> {
    try {
      const sections: any[] = [];

      // Convert document sections to DOCX paragraphs
      document.content.sections.forEach((section) => {
        const docxElements = this.convertSectionToDOCX(section, document.content.formatting);
        sections.push(...docxElements);
      });

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: sections,
          },
        ],
      });

      const buffer = await Packer.toBuffer(doc);
      return buffer;
    } catch (error) {
      console.error('Error exporting to DOCX:', error);
      throw error;
    }
  }

  /**
   * Export document to plain text format
   */
  exportToText(document: GeneratedDocument): string {
    let text = '';

    document.content.sections.forEach((section, index) => {
      if (index > 0) {
        text += '\n\n';
      }

      text += this.convertSectionToText(section);
    });

    return text;
  }

  /**
   * Render a section in PDF
   */
  private renderPDFSection(doc: typeof PDFDocument, section: DocumentSection, formatting: any): void {
    const { type, title, content } = section;

    // Render section based on type
    if (type === 'header') {
      this.renderPDFHeader(doc, content);
    } else if (type === 'summary') {
      doc.fontSize(formatting.fontSize + 2).font('Helvetica-Bold');
      doc.text(title, { continued: false });
      doc.moveDown(0.3);
      doc.fontSize(formatting.fontSize).font('Helvetica');
      doc.text(content as string, { align: 'justify' });
    } else if (type === 'experience') {
      doc.fontSize(formatting.fontSize + 2).font('Helvetica-Bold');
      doc.text(title, { continued: false });
      doc.moveDown(0.3);
      this.renderPDFExperience(doc, content, formatting.fontSize);
    } else if (type === 'education') {
      doc.fontSize(formatting.fontSize + 2).font('Helvetica-Bold');
      doc.text(title, { continued: false });
      doc.moveDown(0.3);
      this.renderPDFEducation(doc, content, formatting.fontSize);
    } else if (type === 'skills') {
      doc.fontSize(formatting.fontSize + 2).font('Helvetica-Bold');
      doc.text(title, { continued: false });
      doc.moveDown(0.3);
      this.renderPDFSkills(doc, content, formatting.fontSize);
    } else if (type === 'custom') {
      if (title !== 'Signature') {
        doc.fontSize(formatting.fontSize).font('Helvetica');
        doc.text(content as string, { align: 'justify' });
      } else {
        doc.moveDown(1);
        doc.fontSize(formatting.fontSize).font('Helvetica');
        doc.text(content as string);
      }
    }
  }

  /**
   * Render header section in PDF
   */
  private renderPDFHeader(doc: typeof PDFDocument, content: any): void {
    doc.fontSize(16).font('Helvetica-Bold');
    doc.text(content.name, { align: 'center' });
    doc.moveDown(0.2);
    
    doc.fontSize(10).font('Helvetica');
    const contactInfo = [
      content.email,
      content.phone,
      content.location,
    ].filter(Boolean).join(' | ');
    
    doc.text(contactInfo, { align: 'center' });
    
    if (content.headline) {
      doc.moveDown(0.2);
      doc.fontSize(11).font('Helvetica-Oblique');
      doc.text(content.headline, { align: 'center' });
    }
    
    doc.moveDown(0.5);
  }

  /**
   * Render experience section in PDF
   */
  private renderPDFExperience(doc: typeof PDFDocument, content: any, baseFontSize: number): void {
    if (content.items && Array.isArray(content.items)) {
      content.items.forEach((item: any, index: number) => {
        if (index > 0) {
          doc.moveDown(0.5);
        }

        doc.fontSize(baseFontSize + 1).font('Helvetica-Bold');
        doc.text(item.title, { continued: true });
        doc.font('Helvetica');
        doc.text(` at ${item.company}`);
        
        doc.fontSize(baseFontSize).font('Helvetica-Oblique');
        doc.text(item.period);
        
        doc.moveDown(0.2);
        doc.font('Helvetica');
        doc.text(item.description, { align: 'justify' });
        
        if (item.achievements && item.achievements.length > 0) {
          doc.moveDown(0.2);
          item.achievements.forEach((achievement: string) => {
            doc.text(`• ${achievement}`, { indent: 20 });
          });
        }
      });
    }
  }

  /**
   * Render education section in PDF
   */
  private renderPDFEducation(doc: typeof PDFDocument, content: any, baseFontSize: number): void {
    if (content.items && Array.isArray(content.items)) {
      content.items.forEach((item: any, index: number) => {
        if (index > 0) {
          doc.moveDown(0.5);
        }

        doc.fontSize(baseFontSize + 1).font('Helvetica-Bold');
        doc.text(`${item.degree} in ${item.fieldOfStudy}`);
        
        doc.fontSize(baseFontSize).font('Helvetica');
        doc.text(item.institution, { continued: true });
        
        if (item.gpa) {
          doc.text(` | GPA: ${item.gpa}`);
        } else {
          doc.text('');
        }
        
        doc.font('Helvetica-Oblique');
        doc.text(item.period);
      });
    }
  }

  /**
   * Render skills section in PDF
   */
  private renderPDFSkills(doc: typeof PDFDocument, content: any, baseFontSize: number): void {
    if (content.skills && Array.isArray(content.skills)) {
      doc.fontSize(baseFontSize).font('Helvetica');
      const skillsText = content.skills.join(' • ');
      doc.text(skillsText, { align: 'justify' });
    }
  }

  /**
   * Convert section to DOCX paragraphs
   */
  private convertSectionToDOCX(section: DocumentSection, formatting: any): any[] {
    const elements: any[] = [];
    const { type, title, content } = section;

    if (type === 'header' && typeof content === 'object') {
      const headerContent = content as any;
      elements.push(
        new Paragraph({
          text: headerContent.name || '',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        })
      );

      const contactInfo = [
        headerContent.email,
        headerContent.phone,
        headerContent.location,
      ].filter(Boolean).join(' | ');

      elements.push(
        new Paragraph({
          text: contactInfo,
          alignment: AlignmentType.CENTER,
        })
      );

      if (headerContent.headline) {
        elements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: headerContent.headline,
                italics: true,
              }),
            ],
            alignment: AlignmentType.CENTER,
          })
        );
      }

      elements.push(new Paragraph({ text: '' })); // Spacing
    } else if (type === 'summary') {
      elements.push(
        new Paragraph({
          text: title,
          heading: HeadingLevel.HEADING_2,
        })
      );
      elements.push(
        new Paragraph({
          text: content as string,
        })
      );
      elements.push(new Paragraph({ text: '' }));
    } else if (type === 'experience') {
      elements.push(
        new Paragraph({
          text: title,
          heading: HeadingLevel.HEADING_2,
        })
      );

      const expContent = content as any;
      if (expContent.items && Array.isArray(expContent.items)) {
        expContent.items.forEach((item: any) => {
          elements.push(
            new Paragraph({
              children: [
                new TextRun({ text: item.title, bold: true }),
                new TextRun({ text: ` at ${item.company}` }),
              ],
            })
          );
          elements.push(
            new Paragraph({
              children: [
                new TextRun({ text: item.period, italics: true }),
              ],
            })
          );
          elements.push(
            new Paragraph({
              text: item.description,
            })
          );

          if (item.achievements && item.achievements.length > 0) {
            item.achievements.forEach((achievement: string) => {
              elements.push(
                new Paragraph({
                  text: `• ${achievement}`,
                  indent: { left: 360 },
                })
              );
            });
          }

          elements.push(new Paragraph({ text: '' }));
        });
      }
    } else if (type === 'education') {
      elements.push(
        new Paragraph({
          text: title,
          heading: HeadingLevel.HEADING_2,
        })
      );

      const eduContent = content as any;
      if (eduContent.items && Array.isArray(eduContent.items)) {
        eduContent.items.forEach((item: any) => {
          elements.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${item.degree} in ${item.fieldOfStudy}`, bold: true }),
              ],
            })
          );
          elements.push(
            new Paragraph({
              text: `${item.institution}${item.gpa ? ` | GPA: ${item.gpa}` : ''}`,
            })
          );
          elements.push(
            new Paragraph({
              children: [
                new TextRun({ text: item.period, italics: true }),
              ],
            })
          );
          elements.push(new Paragraph({ text: '' }));
        });
      }
    } else if (type === 'skills') {
      elements.push(
        new Paragraph({
          text: title,
          heading: HeadingLevel.HEADING_2,
        })
      );

      const skillsContent = content as any;
      if (skillsContent.skills && Array.isArray(skillsContent.skills)) {
        elements.push(
          new Paragraph({
            text: skillsContent.skills.join(' • '),
          })
        );
      }
      elements.push(new Paragraph({ text: '' }));
    } else if (type === 'custom') {
      elements.push(
        new Paragraph({
          text: content as string,
        })
      );
      elements.push(new Paragraph({ text: '' }));
    }

    return elements;
  }

  /**
   * Convert section to plain text
   */
  private convertSectionToText(section: DocumentSection): string {
    const { type, title, content } = section;
    let text = '';

    if (type === 'header' && typeof content === 'object') {
      const headerContent = content as any;
      text += `${headerContent.name || ''}\n`;
      const contactInfo = [
        headerContent.email,
        headerContent.phone,
        headerContent.location,
      ].filter(Boolean).join(' | ');
      text += `${contactInfo}\n`;
      if (headerContent.headline) {
        text += `${headerContent.headline}\n`;
      }
    } else if (type === 'summary') {
      text += `${title.toUpperCase()}\n`;
      text += `${'-'.repeat(title.length)}\n`;
      text += `${content}\n`;
    } else if (type === 'experience') {
      text += `${title.toUpperCase()}\n`;
      text += `${'-'.repeat(title.length)}\n`;

      const expContent = content as any;
      if (expContent.items && Array.isArray(expContent.items)) {
        expContent.items.forEach((item: any, index: number) => {
          if (index > 0) text += '\n';
          text += `${item.title} at ${item.company}\n`;
          text += `${item.period}\n`;
          text += `${item.description}\n`;
          if (item.achievements && item.achievements.length > 0) {
            item.achievements.forEach((achievement: string) => {
              text += `• ${achievement}\n`;
            });
          }
        });
      }
    } else if (type === 'education') {
      text += `${title.toUpperCase()}\n`;
      text += `${'-'.repeat(title.length)}\n`;

      const eduContent = content as any;
      if (eduContent.items && Array.isArray(eduContent.items)) {
        eduContent.items.forEach((item: any, index: number) => {
          if (index > 0) text += '\n';
          text += `${item.degree} in ${item.fieldOfStudy}\n`;
          text += `${item.institution}${item.gpa ? ` | GPA: ${item.gpa}` : ''}\n`;
          text += `${item.period}\n`;
        });
      }
    } else if (type === 'skills') {
      text += `${title.toUpperCase()}\n`;
      text += `${'-'.repeat(title.length)}\n`;

      const skillsContent = content as any;
      if (skillsContent.skills && Array.isArray(skillsContent.skills)) {
        text += skillsContent.skills.join(' • ') + '\n';
      }
    } else if (type === 'custom') {
      text += `${content}\n`;
    }

    return text;
  }
}

export const documentExportService = new DocumentExportService();
