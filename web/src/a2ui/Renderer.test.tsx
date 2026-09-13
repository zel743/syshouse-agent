import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Renderer } from './Renderer';
import { safeParsePantalla, type Pantalla } from './schema';

const pantallaResumen: Pantalla = {
  pantalla_id: 'home_resumen',
  composicion: [
    { tipo: 'kpi', titulo: 'Saldo actual', valor: '11,000', moneda: 'MXN', tendencia: 'positivo', comparacion: '+8% vs. mes anterior' },
    {
      tipo: 'chart',
      subtipo: 'barra',
      titulo: 'Ingresos vs. gastos',
      series: [
        { nombre: 'Ingresos', datos: [18000] },
        { nombre: 'Gastos', datos: [12500] },
      ],
    },
    { tipo: 'texto', estilo: 'parrafo', contenido: 'Recibiste $18,000 y gastaste $12,500.' },
    { tipo: 'tarjeta', variante: 'exito', titulo: 'Buen ritmo de ahorro', descripcion: 'Vas muy bien.' },
  ],
};

const pantallaAlerta: Pantalla = {
  pantalla_id: 'detalle_ahorro',
  composicion: [
    {
      tipo: 'tarjeta',
      variante: 'alerta',
      titulo: 'Vas por debajo de tu meta',
      descripcion: 'Este mes ahorraste $800 de una meta de $2,500.',
      accion_sugerida: { texto: 'Ajustar mi meta', accion: 'ajustar_meta' },
    },
    { tipo: 'boton', texto: 'Ajustar mi meta', accion: 'ajustar_meta', estilo: 'primario' },
  ],
};

const pantallaLista: Pantalla = {
  pantalla_id: 'detalle_mes',
  composicion: [
    {
      tipo: 'lista',
      titulo: 'Movimientos de agosto',
      items: [
        { titulo: 'Renta', categoria: 'Vivienda', monto: '-6,500', fecha: '2025-08-01', accion: 'ver_categoria', parametros: { categoria: 'vivienda' } },
        { titulo: 'Nómina', categoria: 'Ingreso', monto: '+18,000', fecha: '2025-08-15' },
      ],
    },
  ],
};

const pantallaRecomendaciones: Pantalla = {
  pantalla_id: 'recomendaciones',
  composicion: [
    {
      tipo: 'lista',
      titulo: 'Planes recomendados',
      items: [
        { titulo: 'ahorro', categoria: 'facil', monto: '10%' },
        { titulo: 'ahorro', categoria: 'dificil', monto: '25%' },
      ],
    },
  ],
};

const pantallaDona: Pantalla = {
  pantalla_id: 'gastos_categoria',
  composicion: [
    {
      tipo: 'chart',
      subtipo: 'dona',
      titulo: 'Gastos por categoría',
      series: [
        { nombre: 'Vivienda', datos: [31000] },
        { nombre: 'Alimentos', datos: [17000] },
      ],
    },
  ],
};

describe('Renderer — contrato render_ui (agente-educacion-financiera-CLAUDE.md)', () => {
  it('renderiza kpi + chart de comparación + texto + tarjeta (Ejemplo A del doc)', () => {
    render(<Renderer pantalla={pantallaResumen} onAction={vi.fn()} />);
    expect(screen.getByText('Saldo actual')).toBeInTheDocument();
    expect(screen.getByText('$11,000')).toBeInTheDocument();
    expect(screen.getByText('+8% vs. mes anterior')).toBeInTheDocument();
    expect(screen.getByText('Recibiste $18,000 y gastaste $12,500.')).toBeInTheDocument();
    expect(screen.getByText('Buen ritmo de ahorro')).toBeInTheDocument();
  });

  it('dispara onAction con accion + parametros desde accion_sugerida y boton', () => {
    const onAction = vi.fn();
    render(<Renderer pantalla={pantallaAlerta} onAction={onAction} />);

    const botones = screen.getAllByText('Ajustar mi meta');
    fireEvent.click(botones[0]);
    expect(onAction).toHaveBeenCalledWith('ajustar_meta', undefined);

    fireEvent.click(botones[1]);
    expect(onAction).toHaveBeenCalledWith('ajustar_meta', undefined);
  });

  it('lista: colorea monto por signo y dispara accion+parametros al tocar un item', () => {
    const onAction = vi.fn();
    const { container } = render(<Renderer pantalla={pantallaLista} onAction={onAction} />);

    const negativo = screen.getByText('-6,500');
    const positivo = screen.getByText('+18,000');
    expect(negativo.className).toContain('a2ui-monto-negativo');
    expect(positivo.className).toContain('a2ui-monto-positivo');

    fireEvent.click(container.querySelector('.a2ui-clickable')!);
    expect(onAction).toHaveBeenCalledWith('ver_categoria', { categoria: 'vivienda' });
  });

  it('lista: renderiza chips de nivel (traffic light) para recomendaciones', () => {
    const { container } = render(<Renderer pantalla={pantallaRecomendaciones} onAction={vi.fn()} />);
    expect(container.querySelector('.a2ui-chip-facil')).toBeInTheDocument();
    expect(container.querySelector('.a2ui-chip-dificil')).toBeInTheDocument();
  });

  it('chart dona: muestra el total al centro y la leyenda con porcentajes', () => {
    render(<Renderer pantalla={pantallaDona} onAction={vi.fn()} />);
    expect(screen.getByText('$48,000')).toBeInTheDocument();
    expect(screen.getByText('Vivienda')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
  });
});

describe('safeParsePantalla — degradación defensiva (composicion/pantalla_id)', () => {
  it('descarta solo los bloques inválidos y conserva los válidos', () => {
    const pantalla = safeParsePantalla({
      pantalla_id: 'x',
      composicion: [
        { tipo: 'kpi', titulo: 'Válido', valor: 10 },
        { tipo: 'boton', texto: 'Sin accion (inválido)' },
        { tipo: 'algo_que_no_existe' },
      ],
    });
    expect(pantalla.composicion).toHaveLength(1);
    expect(pantalla.composicion[0].tipo).toBe('kpi');
  });

  it('degrada a una tarjeta de texto plano cuando no hay bloques utilizables', () => {
    const pantalla = safeParsePantalla({ contenido: 'El agente devolvió texto libre.' });
    expect(pantalla.composicion).toHaveLength(1);
    expect(pantalla.composicion[0].tipo).toBe('tarjeta');
  });
});
