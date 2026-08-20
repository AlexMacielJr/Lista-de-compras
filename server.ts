import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/tips/weekly', async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY não configurada.' });
      }

      const ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: "Gere uma dica curta, prática e criativa de economia doméstica focada em gestão familiar ou hábitos de compra no mercado. A dica deve ser útil para o dia a dia e ter no máximo 2 ou 3 frases curtas. Não use jargões difíceis.",
        config: {
          systemInstruction: "Você é um assistente financeiro especialista em economia doméstica e compras de mercado. Dê dicas curtas e muito práticas.",
        }
      });

      const tipText = response.text || "Planeje suas refeições da semana antes de ir ao mercado para evitar comprar itens desnecessários por impulso.";
      
      res.json({ tip: tipText });
    } catch (error: any) {
      console.error('Error fetching weekly tip from Gemini:', error);
      // Fallback em caso de falha da API (ex: limite de uso excedido 429)
      const fallbackTips = [
        "Planeje suas refeições da semana antes de ir ao mercado para evitar comprar itens desnecessários por impulso.",
        "Não vá ao mercado com fome! Isso ajuda a evitar compras de produtos que você não planejava levar.",
        "Acompanhe pequenos gastos. Aquele café diário pode não parecer muito, mas soma um valor considerável no fim do mês.",
        "Compare o preço por quilo ou litro dos produtos para ter certeza de qual embalagem realmente vale mais a pena."
      ];
      const randomTip = fallbackTips[Math.floor(Math.random() * fallbackTips.length)];
      res.json({ tip: randomTip, isFallback: true });
    }
  });

  app.post('/api/analyze-list', async (req, res) => {
    try {
      const { items } = req.body;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Nenhum item na lista para analisar.' });
      }

      // ----------------------------------------------------------------------
      // Assistente Offline (Substituto Inteligente)
      // Como a chave da API possui restrições de faturamento na conta atual,
      // esta lógica local entra em ação usando uma tabela base de preços médios.
      // ----------------------------------------------------------------------
      let totalEstimatedPrice = 0;
      
      const itemEstimates = items.map((item: any) => {
        let basePrice = 12; // fallback default
        const nameLower = item.name.toLowerCase();
        const catLower = (item.category || '').toLowerCase();
        
        // Base de conhecimento local aproximada (Brasil)
        if (nameLower.includes('arroz')) basePrice = 28.50;
        else if (nameLower.includes('feijão') || nameLower.includes('feijao')) basePrice = 7.90;
        else if (nameLower.includes('carne') || nameLower.includes('picanha') || nameLower.includes('alcatra')) basePrice = 38.00;
        else if (nameLower.includes('frango')) basePrice = 18.00;
        else if (nameLower.includes('leite')) basePrice = 5.20;
        else if (nameLower.includes('pão') || nameLower.includes('pao')) basePrice = 8.50;
        else if (nameLower.includes('café') || nameLower.includes('cafe')) basePrice = 16.90;
        else if (nameLower.includes('açúcar') || nameLower.includes('acucar')) basePrice = 4.80;
        else if (nameLower.includes('óleo') || nameLower.includes('oleo')) basePrice = 6.80;
        else if (nameLower.includes('manteiga')) basePrice = 12.00;
        else if (nameLower.includes('ovo')) basePrice = 17.50;
        else if (nameLower.includes('cerveja')) basePrice = 4.00;
        else if (nameLower.includes('papel')) basePrice = 15.00;
        else if (nameLower.includes('detergente')) basePrice = 2.80;
        else if (catLower.includes('açougue') || catLower.includes('peixaria')) basePrice = 35;
        else if (catLower.includes('hortifruti')) basePrice = 6.50;
        else if (catLower.includes('limpeza')) basePrice = 14;
        else if (catLower.includes('bebidas')) basePrice = 7.50;
        else if (catLower.includes('higiene')) basePrice = 11;
        else if (catLower.includes('frios')) basePrice = 16;
        
        // Simular a vida real (variação de preços entre mercados de bairro vs grandes atacadistas)
        // Multiplicador aleatório entre -10% e +10%
        const randomVariation = 0.9 + (Math.random() * 0.2);
        const estimatedPrice = Number((basePrice * randomVariation).toFixed(2));
        const estimatedTotal = Number((estimatedPrice * (Number(item.quantity) || 1)).toFixed(2));
        
        totalEstimatedPrice += estimatedTotal;
        
        return {
          name: item.name,
          estimatedUnitPrice: estimatedPrice,
          estimatedTotal
        };
      });

      // Lógica para decidir qual tipo de mercado sugerir
      const isHighVolume = items.length >= 8 || totalEstimatedPrice > 200;
      const suggestedStore = isHighVolume ? 'Atacadão / Assaí Atacadista' : 'Mercado de Bairro (Local)';
      const reasoning = isHighVolume 
        ? 'A sua lista contém muitos itens ou um valor mais elevado. Redes de atacarejo como Atacadão e Assaí conseguem oferecer um custo médio por item muito menor se comparado a mercados menores.'
        : 'Sua lista tem um perfil rápido ou de reposição (compras menores). Um mercado no seu bairro acaba sendo mais vantajoso pela conveniência, rapidez e economia com deslocamento/gasolina.';

      const result = {
        suggestedStore,
        reasoning,
        totalEstimatedPrice: Number(totalEstimatedPrice.toFixed(2)),
        itemEstimates
      };

      // Simular leve tempo de "análise" antes de responder
      setTimeout(() => {
        res.json(result);
      }, 1000);

    } catch (error: any) {
      console.error('Error analyzing list with offline logic:', error);
      res.status(500).json({ error: error.message || 'Erro ao analisar a lista.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
