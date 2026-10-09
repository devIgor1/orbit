import { Plus } from 'lucide-react'
import { LandingSectionHeading } from './landing-section-heading'

const questions = [
  {
    question: 'Para quem o Orbit foi pensado?',
    answer:
      'Para agências, estúdios e equipes criativas que precisam organizar projetos, distribuir tarefas e acompanhar entregas em um só lugar.',
  },
  {
    question: 'Como acesso meu workspace?',
    answer:
      'Selecione “Acessar workspace” e entre com o e-mail e a senha da sua conta. O acesso exige uma conta já cadastrada e vinculada ao workspace da sua equipe; o cadastro público ainda não está disponível.',
  },
  {
    question: 'Posso alternar entre lista e Kanban?',
    answer:
      'Sim. As tarefas de cada projeto podem ser vistas em lista ou em um quadro com as etapas A fazer, Em andamento, Em revisão e Concluído. Você pode mudar a etapa pelo seletor de status ou arrastar a tarefa no computador.',
  },
  {
    question: 'Onde ficam os comentários e as atualizações?',
    answer:
      'Cada tarefa tem um painel com seus detalhes, comentários e histórico de alterações. Assim, a equipe pode compartilhar contexto e acompanhar o que mudou junto do trabalho.',
  },
  {
    question: 'O Orbit funciona no celular?',
    answer:
      'Sim. A interface se adapta ao celular, ao tablet e ao computador. No celular, use a lista ou navegue pelas colunas do quadro; o seletor de status permite atualizar a etapa de uma tarefa sem arrastar.',
  },
]

export function LandingFaq() {
  return (
    <section id="duvidas" className="landing-section landing-faq" aria-labelledby="landing-faq-title">
      <div className="landing-container landing-faq-layout">
        <LandingSectionHeading
          id="landing-faq-title"
          description="Como entrar no workspace, acompanhar tarefas e manter as conversas junto do trabalho."
        >
          Acesso, rotina e equipe.
          <br /> <span>Vamos aos detalhes.</span>
        </LandingSectionHeading>
        <div className="landing-faq-list">
          {questions.map(({ question, answer }) => (
            <details className="landing-faq-item" key={question}>
              <summary>
                <span>{question}</span>
                <Plus aria-hidden="true" />
              </summary>
              <div className="landing-faq-answer">
                <p>{answer}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
