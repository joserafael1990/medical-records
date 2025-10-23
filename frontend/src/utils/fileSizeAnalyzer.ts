import fs from 'fs';
import path from 'path';

interface FileSizeReport {
  filePath: string;
  lineCount: number;
  size: number;
  status: 'ok' | 'warning' | 'error';
  recommendations: string[];
}

interface AnalysisResult {
  totalFiles: number;
  oversizedFiles: FileSizeReport[];
  warnings: FileSizeReport[];
  recommendations: string[];
  summary: {
    totalLines: number;
    averageLines: number;
    maxLines: number;
    filesOverLimit: number;
  };
}

export class FileSizeAnalyzer {
  private readonly MAX_COMPONENT_LINES = 300;
  private readonly MAX_HOOK_LINES = 200;
  private readonly MAX_SERVICE_LINES = 500;
  private readonly MAX_UTIL_LINES = 100;

  analyzeDirectory(dirPath: string): AnalysisResult {
    const files = this.getTypeScriptFiles(dirPath);
    const reports: FileSizeReport[] = [];
    
    for (const file of files) {
      const report = this.analyzeFile(file);
      if (report) {
        reports.push(report);
      }
    }

    return this.generateReport(reports);
  }

  private getTypeScriptFiles(dirPath: string): string[] {
    const files: string[] = [];
    
    const scanDirectory = (currentPath: string) => {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !this.shouldSkipDirectory(item)) {
          scanDirectory(fullPath);
        } else if (stat.isFile() && this.isTypeScriptFile(item)) {
          files.push(fullPath);
        }
      }
    };

    scanDirectory(dirPath);
    return files;
  }

  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', '__tests__', 'coverage'];
    return skipDirs.includes(dirName);
  }

  private isTypeScriptFile(fileName: string): boolean {
    return fileName.endsWith('.ts') || fileName.endsWith('.tsx');
  }

  private analyzeFile(filePath: string): FileSizeReport | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const lineCount = lines.length;
      const size = Buffer.byteLength(content, 'utf-8');
      
      const maxLines = this.getMaxLinesForFile(filePath);
      const status = this.getStatus(lineCount, maxLines);
      const recommendations = this.getRecommendations(filePath, lineCount, maxLines);

      return {
        filePath: this.getRelativePath(filePath),
        lineCount,
        size,
        status,
        recommendations
      };
    } catch (error) {
      console.error(`Error analyzing file ${filePath}:`, error);
      return null;
    }
  }

  private getMaxLinesForFile(filePath: string): number {
    if (filePath.includes('/components/') || filePath.includes('\\components\\')) {
      return this.MAX_COMPONENT_LINES;
    }
    if (filePath.includes('/hooks/') || filePath.includes('\\hooks\\')) {
      return this.MAX_HOOK_LINES;
    }
    if (filePath.includes('/services/') || filePath.includes('\\services\\')) {
      return this.MAX_SERVICE_LINES;
    }
    if (filePath.includes('/utils/') || filePath.includes('\\utils\\')) {
      return this.MAX_UTIL_LINES;
    }
    return this.MAX_COMPONENT_LINES; // Default
  }

  private getStatus(lineCount: number, maxLines: number): 'ok' | 'warning' | 'error' {
    if (lineCount <= maxLines) {
      return 'ok';
    }
    if (lineCount <= maxLines * 1.5) {
      return 'warning';
    }
    return 'error';
  }

  private getRecommendations(filePath: string, lineCount: number, maxLines: number): string[] {
    const recommendations: string[] = [];
    
    if (lineCount > maxLines) {
      if (filePath.includes('/components/')) {
        recommendations.push('Dividir en componentes más pequeños');
        recommendations.push('Extraer lógica a custom hooks');
        recommendations.push('Usar lazy loading si es un componente pesado');
      }
      
      if (filePath.includes('/hooks/')) {
        recommendations.push('Dividir en hooks más específicos');
        recommendations.push('Extraer lógica común a utilidades');
      }
      
      if (filePath.includes('/services/')) {
        recommendations.push('Dividir en servicios específicos por dominio');
        recommendations.push('Extraer lógica de negocio a clases separadas');
      }
      
      if (filePath.includes('/utils/')) {
        recommendations.push('Dividir en utilidades más específicas');
        recommendations.push('Extraer funciones complejas a módulos separados');
      }
    }

    if (lineCount > 1000) {
      recommendations.push('URGENTE: Refactorizar inmediatamente');
      recommendations.push('Considerar dividir en múltiples archivos');
    }

    return recommendations;
  }

  private getRelativePath(filePath: string): string {
    const projectRoot = process.cwd();
    return path.relative(projectRoot, filePath);
  }

  private generateReport(reports: FileSizeReport[]): AnalysisResult {
    const oversizedFiles = reports.filter(r => r.status === 'error');
    const warnings = reports.filter(r => r.status === 'warning');
    
    const totalLines = reports.reduce((sum, r) => sum + r.lineCount, 0);
    const averageLines = Math.round(totalLines / reports.length);
    const maxLines = Math.max(...reports.map(r => r.lineCount));
    const filesOverLimit = oversizedFiles.length + warnings.length;

    const recommendations = [
      'Implementar lazy loading para componentes pesados',
      'Usar tree shaking para Material-UI',
      'Dividir archivos grandes en módulos más pequeños',
      'Extraer lógica compleja a custom hooks',
      'Implementar code splitting por rutas'
    ];

    return {
      totalFiles: reports.length,
      oversizedFiles,
      warnings,
      recommendations,
      summary: {
        totalLines,
        averageLines,
        maxLines,
        filesOverLimit
      }
    };
  }

  generateMarkdownReport(result: AnalysisResult): string {
    let report = '# 📊 Análisis de Tamaño de Archivos\n\n';
    
    report += `## 📈 Resumen\n\n`;
    report += `- **Total de archivos analizados:** ${result.totalFiles}\n`;
    report += `- **Archivos con problemas:** ${result.filesOverLimit}\n`;
    report += `- **Líneas totales:** ${result.summary.totalLines.toLocaleString()}\n`;
    report += `- **Promedio de líneas por archivo:** ${result.summary.averageLines}\n`;
    report += `- **Archivo más grande:** ${result.summary.maxLines} líneas\n\n`;

    if (result.oversizedFiles.length > 0) {
      report += `## 🚨 Archivos que Exceden el Límite\n\n`;
      result.oversizedFiles.forEach(file => {
        report += `### ${file.filePath}\n`;
        report += `- **Líneas:** ${file.lineCount}\n`;
        report += `- **Tamaño:** ${(file.size / 1024).toFixed(2)} KB\n`;
        report += `- **Recomendaciones:**\n`;
        file.recommendations.forEach(rec => {
          report += `  - ${rec}\n`;
        });
        report += '\n';
      });
    }

    if (result.warnings.length > 0) {
      report += `## ⚠️ Archivos con Advertencias\n\n`;
      result.warnings.forEach(file => {
        report += `- **${file.filePath}:** ${file.lineCount} líneas\n`;
      });
      report += '\n';
    }

    report += `## 💡 Recomendaciones Generales\n\n`;
    result.recommendations.forEach(rec => {
      report += `- ${rec}\n`;
    });

    return report;
  }
}

// Export utility function
export const analyzeProject = (projectPath: string): AnalysisResult => {
  const analyzer = new FileSizeAnalyzer();
  return analyzer.analyzeDirectory(projectPath);
};

export const generateReport = (result: AnalysisResult): string => {
  const analyzer = new FileSizeAnalyzer();
  return analyzer.generateMarkdownReport(result);
};
