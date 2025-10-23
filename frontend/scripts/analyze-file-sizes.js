#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple file size analyzer for Node.js
class FileSizeAnalyzer {
  constructor() {
    this.MAX_COMPONENT_LINES = 300;
    this.MAX_HOOK_LINES = 200;
    this.MAX_SERVICE_LINES = 500;
    this.MAX_UTIL_LINES = 100;
  }

  analyzeDirectory(dirPath) {
    const files = this.getTypeScriptFiles(dirPath);
    const reports = [];
    
    for (const file of files) {
      const report = this.analyzeFile(file);
      if (report) {
        reports.push(report);
      }
    }

    return this.generateReport(reports);
  }

  getTypeScriptFiles(dirPath) {
    const files = [];
    
    const scanDirectory = (currentPath) => {
      try {
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
      } catch (error) {
        // Skip directories that can't be read
      }
    };

    scanDirectory(dirPath);
    return files;
  }

  shouldSkipDirectory(dirName) {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', '__tests__', 'coverage', '.next'];
    return skipDirs.includes(dirName);
  }

  isTypeScriptFile(fileName) {
    return fileName.endsWith('.ts') || fileName.endsWith('.tsx');
  }

  analyzeFile(filePath) {
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

  getMaxLinesForFile(filePath) {
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
    return this.MAX_COMPONENT_LINES;
  }

  getStatus(lineCount, maxLines) {
    if (lineCount <= maxLines) {
      return 'ok';
    }
    if (lineCount <= maxLines * 1.5) {
      return 'warning';
    }
    return 'error';
  }

  getRecommendations(filePath, lineCount, maxLines) {
    const recommendations = [];
    
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

  getRelativePath(filePath) {
    const projectRoot = process.cwd();
    return path.relative(projectRoot, filePath);
  }

  generateReport(reports) {
    const oversizedFiles = reports.filter(r => r.status === 'error');
    const warnings = reports.filter(r => r.status === 'warning');
    
    const totalLines = reports.reduce((sum, r) => sum + r.lineCount, 0);
    const averageLines = Math.round(totalLines / reports.length);
    const maxLines = Math.max(...reports.map(r => r.lineCount));
    const filesOverLimit = oversizedFiles.length + warnings.length;

    return {
      totalFiles: reports.length,
      oversizedFiles,
      warnings,
      summary: {
        totalLines,
        averageLines,
        maxLines,
        filesOverLimit
      }
    };
  }

  generateMarkdownReport(result) {
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
    report += `- Implementar lazy loading para componentes pesados\n`;
    report += `- Usar tree shaking para Material-UI\n`;
    report += `- Dividir archivos grandes en módulos más pequeños\n`;
    report += `- Extraer lógica compleja a custom hooks\n`;
    report += `- Implementar code splitting por rutas\n`;

    return report;
  }
}

// Main execution
if (require.main === module) {
  const analyzer = new FileSizeAnalyzer();
  const srcPath = path.join(__dirname, '../src');
  
  console.log('🔍 Analizando archivos TypeScript...');
  const result = analyzer.analyzeDirectory(srcPath);
  
  console.log('\n📊 Resultados del Análisis:');
  console.log(`Total de archivos: ${result.totalFiles}`);
  console.log(`Archivos con problemas: ${result.filesOverLimit}`);
  console.log(`Líneas totales: ${result.summary.totalLines.toLocaleString()}`);
  console.log(`Promedio de líneas: ${result.summary.averageLines}`);
  console.log(`Archivo más grande: ${result.summary.maxLines} líneas`);
  
  if (result.oversizedFiles.length > 0) {
    console.log('\n🚨 Archivos que exceden el límite:');
    result.oversizedFiles.forEach(file => {
      console.log(`- ${file.filePath}: ${file.lineCount} líneas`);
    });
  }
  
  if (result.warnings.length > 0) {
    console.log('\n⚠️ Archivos con advertencias:');
    result.warnings.forEach(file => {
      console.log(`- ${file.filePath}: ${file.lineCount} líneas`);
    });
  }
  
  // Generate markdown report
  const markdownReport = analyzer.generateMarkdownReport(result);
  const reportPath = path.join(__dirname, '../FILE_SIZE_ANALYSIS.md');
  fs.writeFileSync(reportPath, markdownReport);
  console.log(`\n📄 Reporte generado: ${reportPath}`);
}

module.exports = FileSizeAnalyzer;
